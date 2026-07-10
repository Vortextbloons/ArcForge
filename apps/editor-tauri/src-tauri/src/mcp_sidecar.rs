//! Spawns the ArcForge MCP HTTP server as a child process while the editor is open.

use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

const DEFAULT_PORT: u16 = 3847;
const MAX_LOG_TAIL: usize = 32_000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpRuntimeStatus {
    pub running: bool,
    pub url: Option<String>,
    pub project_root: Option<String>,
    pub port: u16,
    pub write: bool,
    pub error: Option<String>,
    pub log_path: Option<String>,
    pub pid: Option<u32>,
}

struct McpProcess {
    child: Child,
    project_root: String,
    port: u16,
    write: bool,
    log_path: PathBuf,
}

pub struct McpSidecarState {
    inner: Mutex<Option<McpProcess>>,
    last_error: Mutex<Option<String>>,
    last_log_path: Mutex<Option<PathBuf>>,
}

impl Default for McpSidecarState {
    fn default() -> Self {
        Self {
            inner: Mutex::new(None),
            last_error: Mutex::new(None),
            last_log_path: Mutex::new(None),
        }
    }
}

impl Drop for McpSidecarState {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.inner.lock() {
            stop_locked(&mut guard);
        }
    }
}

fn log_line(path: &Path, message: &str) {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let line = format!("[{ts}] {message}\n");
    eprintln!("[arcforge-mcp-sidecar] {message}");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = file.write_all(line.as_bytes());
    }
}

fn set_error(state: &McpSidecarState, message: Option<String>) {
    if let Ok(mut err) = state.last_error.lock() {
        *err = message;
    }
}

fn set_log_path(state: &McpSidecarState, path: Option<PathBuf>) {
    if let Ok(mut slot) = state.last_log_path.lock() {
        *slot = path;
    }
}

fn kill_child(child: &mut Child) {
    #[cfg(windows)]
    {
        let pid = child.id();
        let _ = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
        let _ = child.wait();
        return;
    }
    #[cfg(not(windows))]
    {
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn stop_locked(guard: &mut Option<McpProcess>) {
    if let Some(mut proc) = guard.take() {
        log_line(&proc.log_path, &format!("stopping MCP pid={}", proc.child.id()));
        kill_child(&mut proc.child);
        log_line(&proc.log_path, "MCP stopped");
    }
}

fn find_node_bin() -> PathBuf {
    #[cfg(windows)]
    {
        let candidates = [
            PathBuf::from(r"C:\Program Files\nodejs\node.exe"),
            PathBuf::from(r"C:\Program Files (x86)\nodejs\node.exe"),
        ];
        for candidate in candidates {
            if candidate.exists() {
                return candidate;
            }
        }
    }
    PathBuf::from("node")
}

fn mcp_cli_under(root: &Path) -> Option<PathBuf> {
    let candidate = root
        .join("packages")
        .join("mcp-server")
        .join("dist")
        .join("cli.js");
    candidate.exists().then_some(candidate)
}

fn walk_for_mcp_cli(start: &Path) -> Option<PathBuf> {
    let mut current = Some(start);
    while let Some(dir) = current {
        if let Some(cli) = mcp_cli_under(dir) {
            return Some(cli);
        }
        current = dir.parent();
    }
    None
}

/// Resolve MCP CLI for projects that live outside the ArcForge monorepo.
fn find_mcp_cli(project_root: &Path) -> Option<PathBuf> {
    // 1) Explicit override for packaged / custom installs.
    if let Ok(root) = std::env::var("ARCFORGE_ROOT") {
        if let Some(cli) = mcp_cli_under(Path::new(&root)) {
            return Some(cli);
        }
    }
    if let Ok(cli) = std::env::var("ARCFORGE_MCP_CLI") {
        let path = PathBuf::from(cli);
        if path.exists() {
            return Some(path);
        }
    }

    // 2) Walk up from the open game project (works for examples/* inside the repo).
    if let Some(cli) = walk_for_mcp_cli(project_root) {
        return Some(cli);
    }

    // 3) Walk up from the editor executable.
    // Dev: .../apps/editor-tauri/src-tauri/target/debug/arcforge-editor.exe
    // → .../ArcForge/packages/mcp-server/dist/cli.js
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            if let Some(cli) = walk_for_mcp_cli(parent) {
                return Some(cli);
            }
        }
    }

    // 4) Current working directory (often the monorepo root during `pnpm dev:tauri`).
    if let Ok(cwd) = std::env::current_dir() {
        if let Some(cli) = walk_for_mcp_cli(&cwd) {
            return Some(cli);
        }
    }

    None
}

fn resolve_log_path(project_root: &Path) -> PathBuf {
    let dir = project_root.join(".threeforge");
    let _ = fs::create_dir_all(&dir);
    let path = dir.join("mcp.sidecar.log");
    // Ensure the file exists even if spawn fails before the first write.
    let _ = OpenOptions::new().create(true).append(true).open(&path);
    path
}

fn health_is_up(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{port}/health");
    ureq::get(&url)
        .timeout(Duration::from_millis(300))
        .call()
        .map(|r| (200..300).contains(&r.status()))
        .unwrap_or(false)
}

fn wait_for_port_free(port: u16, attempts: u32) -> bool {
    for _ in 0..attempts {
        if !health_is_up(port) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    !health_is_up(port)
}

/// Kill whatever is still listening on the MCP port (orphans from HMR / crashed editor).
fn free_port(port: u16, log_path: &Path) {
    #[cfg(windows)]
    {
        let script = format!(
            "$conns = Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue; \
             if ($conns) {{ $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {{ \
               Write-Output $_; Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue \
             }} }}"
        );
        if let Ok(output) = Command::new("powershell")
            .args(["-NoProfile", "-Command", &script])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let pid = line.trim();
                if !pid.is_empty() {
                    log_line(log_path, &format!("freed port {port} by killing pid={pid}"));
                }
            }
        }
    }

    #[cfg(not(windows))]
    {
        let _ = port;
        let _ = log_path;
    }

    let _ = wait_for_port_free(port, 25);
}

fn child_still_running(child: &mut Child) -> bool {
    matches!(child.try_wait(), Ok(None))
}

fn read_log_tail(path: &Path) -> String {
    let Ok(mut file) = File::open(path) else {
        return String::new();
    };
    let mut buf = String::new();
    let _ = file.read_to_string(&mut buf);
    if buf.len() <= MAX_LOG_TAIL {
        return buf;
    }
    buf[buf.len() - MAX_LOG_TAIL..].to_string()
}

fn spawn_mcp(
    project_root: &str,
    write: bool,
    port: u16,
    log_path: &Path,
) -> Result<(Child, PathBuf), String> {
    let root = PathBuf::from(project_root);
    if !root.exists() {
        let msg = format!("Project root does not exist: {project_root}");
        log_line(log_path, &msg);
        return Err(msg);
    }

    let cli = match find_mcp_cli(&root) {
        Some(cli) => cli,
        None => {
            let exe = std::env::current_exe()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|_| "(unknown)".into());
            let cwd = std::env::current_dir()
                .map(|p| p.display().to_string())
                .unwrap_or_else(|_| "(unknown)".into());
            let msg = format!(
                "Could not find packages/mcp-server/dist/cli.js.\n\
                 Project: {project_root}\n\
                 Editor exe: {exe}\n\
                 Cwd: {cwd}\n\
                 Fix: run `pnpm --filter @arcforge/mcp-server build` in the ArcForge repo,\n\
                 or set ARCFORGE_ROOT to the ArcForge monorepo path\n\
                 (or ARCFORGE_MCP_CLI to the full path of dist/cli.js)."
            );
            log_line(log_path, &msg);
            return Err(msg);
        }
    };

    let node = find_node_bin();
    let stdout_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| {
            let msg = format!("Cannot open MCP log {}: {e}", log_path.display());
            log_line(log_path, &msg);
            msg
        })?;
    let stderr_file = stdout_file.try_clone().map_err(|e| {
        let msg = format!("Cannot clone MCP log handle: {e}");
        log_line(log_path, &msg);
        msg
    })?;

    log_line(
        log_path,
        &format!(
            "spawning node={} cli={} project={} write={write} port={port}",
            node.display(),
            cli.display(),
            root.display()
        ),
    );

    let mut cmd = Command::new(&node);
    cmd.arg(&cli)
        .arg("--project")
        .arg(&root)
        .arg(if write { "--write" } else { "--readonly" })
        .arg("--http")
        .arg("--port")
        .arg(port.to_string())
        .arg("--attached")
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout_file))
        .stderr(Stdio::from(stderr_file));

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn().map_err(|e| {
        let msg = format!(
            "Failed to spawn MCP server with {} {}: {e}",
            node.display(),
            cli.display()
        );
        log_line(log_path, &msg);
        msg
    })?;

    log_line(log_path, &format!("spawned pid={}", child.id()));
    Ok((child, cli))
}

fn status_from_proc(proc: &McpProcess, error: Option<String>) -> McpRuntimeStatus {
    McpRuntimeStatus {
        running: true,
        url: Some(format!("http://127.0.0.1:{}/mcp", proc.port)),
        project_root: Some(proc.project_root.clone()),
        port: proc.port,
        write: proc.write,
        error,
        log_path: Some(proc.log_path.display().to_string()),
        pid: Some(proc.child.id()),
    }
}

pub fn stop_mcp_process(state: &McpSidecarState) {
    let log_path = state
        .last_log_path
        .lock()
        .ok()
        .and_then(|p| p.clone());
    let port = {
        let guard = state.inner.lock().ok();
        guard
            .as_ref()
            .and_then(|g| g.as_ref().map(|p| p.port))
            .unwrap_or(DEFAULT_PORT)
    };

    if let Ok(mut guard) = state.inner.lock() {
        stop_locked(&mut guard);
    }
    if let Some(path) = log_path.as_ref() {
        free_port(port, path);
    } else {
        // Best-effort orphan cleanup even without a log file.
        let fallback = PathBuf::from(std::env::temp_dir()).join("arcforge-mcp-sidecar.log");
        free_port(port, &fallback);
    }
    set_error(state, None);
}

pub fn start_mcp_process(
    state: &McpSidecarState,
    project_root: String,
    write: bool,
    port: Option<u16>,
) -> Result<McpRuntimeStatus, String> {
    let port = port.unwrap_or(DEFAULT_PORT);
    let log_path = resolve_log_path(Path::new(&project_root));
    set_log_path(state, Some(log_path.clone()));
    log_line(
        &log_path,
        &format!("start requested project={project_root} write={write} port={port}"),
    );

    {
        let mut guard = state
            .inner
            .lock()
            .map_err(|_| "MCP state lock poisoned".to_string())?;

        if let Some(proc) = guard.as_mut() {
            let still_running = matches!(proc.child.try_wait(), Ok(None));
            if still_running
                && proc.project_root == project_root
                && proc.write == write
                && proc.port == port
            {
                log_line(&log_path, "MCP already running for this project");
                return Ok(status_from_proc(proc, None));
            }
            stop_locked(&mut guard);
        }

        // Always clear the port — HMR / previous editor runs leave orphan node listeners.
        free_port(port, &log_path);
        if health_is_up(port) {
            let msg = format!(
                "Port {port} is still in use after cleanup. Close other ArcForge/MCP instances or free the port."
            );
            log_line(&log_path, &msg);
            set_error(state, Some(msg.clone()));
            return Err(msg);
        }

        let (mut child, _cli) = match spawn_mcp(&project_root, write, port, &log_path) {
            Ok(v) => v,
            Err(err) => {
                set_error(state, Some(err.clone()));
                return Err(err);
            }
        };

        // Health must come from OUR child — an orphan can answer /health while we EADDRINUSE.
        let mut healthy = false;
        for _ in 0..40 {
            if !child_still_running(&mut child) {
                break;
            }
            if health_is_up(port) {
                healthy = true;
                break;
            }
            std::thread::sleep(Duration::from_millis(250));
        }

        if !healthy || !child_still_running(&mut child) {
            let tail = read_log_tail(&log_path);
            let mut detail = format!(
                "MCP server failed to stay up on port {port}. Log: {}",
                log_path.display()
            );
            if !tail.trim().is_empty() {
                detail = format!("{detail}\n--- log tail ---\n{}", tail.trim());
            }
            log_line(&log_path, "startup verification failed (child exited or port conflict)");
            kill_child(&mut child);
            free_port(port, &log_path);
            set_error(state, Some(detail.clone()));
            return Err(detail);
        }

        log_line(
            &log_path,
            &format!("healthy url=http://127.0.0.1:{port}/mcp pid={}", child.id()),
        );

        *guard = Some(McpProcess {
            child,
            project_root: project_root.clone(),
            port,
            write,
            log_path: log_path.clone(),
        });

        let pid = guard.as_ref().map(|p| p.child.id());
        set_error(state, None);
        return Ok(McpRuntimeStatus {
            running: true,
            url: Some(format!("http://127.0.0.1:{port}/mcp")),
            project_root: Some(project_root),
            port,
            write,
            error: None,
            log_path: Some(log_path.display().to_string()),
            pid,
        });
    }
}

pub fn mcp_status(state: &McpSidecarState) -> McpRuntimeStatus {
    let error = state.last_error.lock().ok().and_then(|e| e.clone());
    let fallback_log = state
        .last_log_path
        .lock()
        .ok()
        .and_then(|p| p.clone())
        .map(|p| p.display().to_string());

    let mut guard = match state.inner.lock() {
        Ok(g) => g,
        Err(_) => {
            return McpRuntimeStatus {
                running: false,
                url: None,
                project_root: None,
                port: DEFAULT_PORT,
                write: false,
                error: Some("MCP state lock poisoned".into()),
                log_path: fallback_log,
                pid: None,
            }
        }
    };

    if let Some(proc) = guard.as_mut() {
        match proc.child.try_wait() {
            Ok(None) => return status_from_proc(proc, None),
            Ok(Some(status)) => {
                let msg = format!(
                    "MCP process exited ({status}). See {}",
                    proc.log_path.display()
                );
                log_line(&proc.log_path, &msg);
                let log_path = Some(proc.log_path.display().to_string());
                stop_locked(&mut guard);
                set_error(state, Some(msg.clone()));
                return McpRuntimeStatus {
                    running: false,
                    url: None,
                    project_root: None,
                    port: DEFAULT_PORT,
                    write: false,
                    error: Some(msg),
                    log_path,
                    pid: None,
                };
            }
            Err(e) => {
                let msg = format!("Failed to poll MCP process: {e}");
                log_line(&proc.log_path, &msg);
                let log_path = Some(proc.log_path.display().to_string());
                stop_locked(&mut guard);
                set_error(state, Some(msg.clone()));
                return McpRuntimeStatus {
                    running: false,
                    url: None,
                    project_root: None,
                    port: DEFAULT_PORT,
                    write: false,
                    error: Some(msg),
                    log_path,
                    pid: None,
                };
            }
        }
    }

    McpRuntimeStatus {
        running: false,
        url: None,
        project_root: None,
        port: DEFAULT_PORT,
        write: false,
        error,
        log_path: fallback_log,
        pid: None,
    }
}

#[tauri::command]
pub fn start_mcp_server(
    state: State<'_, McpSidecarState>,
    project_root: String,
    write: Option<bool>,
    port: Option<u16>,
) -> Result<McpRuntimeStatus, String> {
    start_mcp_process(&state, project_root, write.unwrap_or(false), port)
}

#[tauri::command]
pub fn stop_mcp_server(state: State<'_, McpSidecarState>) -> Result<McpRuntimeStatus, String> {
    stop_mcp_process(&state);
    Ok(mcp_status(&state))
}

#[tauri::command]
pub fn get_mcp_server_status(state: State<'_, McpSidecarState>) -> McpRuntimeStatus {
    mcp_status(&state)
}

#[tauri::command]
pub fn get_mcp_server_logs(state: State<'_, McpSidecarState>) -> Result<String, String> {
    let path = {
        let guard = state
            .inner
            .lock()
            .map_err(|_| "MCP state lock poisoned".to_string())?;
        if let Some(proc) = guard.as_ref() {
            Some(proc.log_path.clone())
        } else {
            state.last_log_path.lock().ok().and_then(|p| p.clone())
        }
    };

    let Some(path) = path else {
        return Ok("No MCP log file yet. Open a disk project to start MCP.".into());
    };

    if !path.exists() {
        return Ok(format!("Log file not found yet:\n{}", path.display()));
    }

    let tail = read_log_tail(&path);
    if tail.trim().is_empty() {
        Ok(format!("(empty)\n{}", path.display()))
    } else {
        Ok(format!("{}\n\n---\n{}", path.display(), tail.trim_end()))
    }
}

/// Ensure child is killed when the Tauri app exits.
pub fn on_app_exit(app: &AppHandle) {
    if let Some(state) = app.try_state::<McpSidecarState>() {
        stop_mcp_process(&state);
    }
}
