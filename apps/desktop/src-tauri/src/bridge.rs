use std::sync::Arc;
use std::thread;

use serde_json::json;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

use crate::engine::Manager;
use crate::models::AddDownloadRequest;

/// Default loopback port the desktop app listens on for the browser bridge.
pub const DEFAULT_BRIDGE_PORT: u16 = 47821;

/// Settings key shared with the command layer.
pub const SETTINGS_BRIDGE_PORT: &str = "bridge_port";

/// Exposes the port the bridge actually bound to so the UI can show it.
#[derive(Default)]
pub struct BridgeState {
    pub port: std::sync::Mutex<Option<u16>>,
}

/// Start the bridge on the loopback interface. When the requested port is
/// unavailable an ephemeral port is used instead; either way the port in use
/// is returned so it can be surfaced to the user.
pub fn start(manager: Arc<Manager>, requested_port: u16) -> std::io::Result<u16> {
    let (server, port) = bind(requested_port)?;
    thread::spawn(move || serve(server, manager));
    Ok(port)
}

fn bind(requested_port: u16) -> std::io::Result<(Server, u16)> {
    match Server::http(("127.0.0.1", requested_port)) {
        Ok(server) => Ok((server, requested_port)),
        Err(_) => {
            let server = Server::http(("127.0.0.1", 0)).map_err(io_other)?;
            let port = server
                .server_addr()
                .to_ip()
                .map(|addr| addr.port())
                .unwrap_or(0);
            Ok((server, port))
        }
    }
}

fn io_other<E: std::fmt::Display>(err: E) -> std::io::Error {
    std::io::Error::other(err.to_string())
}

fn serve(server: Server, manager: Arc<Manager>) {
    for request in server.incoming_requests() {
        if let Err(err) = handle(&manager, request) {
            eprintln!("[neson] bridge request failed: {err}");
        }
    }
}

fn handle(manager: &Arc<Manager>, request: Request) -> std::io::Result<()> {
    let method = request.method().clone();
    let path = request.url().split('?').next().unwrap_or("").to_string();

    if method == Method::Options {
        return respond(request, StatusCode(204), Vec::new());
    }

    match (method, path.as_str()) {
        (Method::Get, "/health") => {
            let body = json!({
                "ok": true,
                "app": "neson",
                "version": env!("CARGO_PKG_VERSION"),
            })
            .to_string();
            respond(request, StatusCode(200), body.into_bytes())
        }
        (Method::Post, "/downloads") => handle_add(manager, request),
        _ => respond(
            request,
            StatusCode(404),
            error_body("not found").into_bytes(),
        ),
    }
}

fn handle_add(manager: &Arc<Manager>, mut request: Request) -> std::io::Result<()> {
    let mut body = String::new();
    if let Err(err) = request.as_reader().read_to_string(&mut body) {
        return respond(
            request,
            StatusCode(400),
            error_body(&format!("could not read request body: {err}")).into_bytes(),
        );
    }

    let req: AddDownloadRequest = match serde_json::from_str(&body) {
        Ok(req) => req,
        Err(err) => {
            return respond(
                request,
                StatusCode(400),
                error_body(&format!("invalid JSON: {err}")).into_bytes(),
            );
        }
    };

    match manager.add_download(&req) {
        Ok(download) => {
            let body = serde_json::to_vec(&download).unwrap_or_else(|_| b"{}".to_vec());
            respond(request, StatusCode(200), body)
        }
        Err(err) => respond(
            request,
            StatusCode(400),
            error_body(&err.to_string()).into_bytes(),
        ),
    }
}

fn respond(request: Request, status: StatusCode, body: Vec<u8>) -> std::io::Result<()> {
    let mut response = Response::from_data(body)
        .with_status_code(status)
        .with_header(header("Content-Type", "application/json"));

    // The bridge is intentionally open to anything on the machine, so any
    // origin is allowed to call it.
    response.add_header(header("Access-Control-Allow-Origin", "*"));
    response.add_header(header("Access-Control-Allow-Headers", "content-type"));
    response.add_header(header("Access-Control-Allow-Methods", "GET, POST, OPTIONS"));
    response.add_header(header("Access-Control-Max-Age", "600"));

    request.respond(response)
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes().to_vec(), value.as_bytes().to_vec()).expect("valid header")
}

fn error_body(message: &str) -> String {
    json!({ "error": message }).to_string()
}
