// Prevents additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebKitGTK's DMA-BUF renderer crashes on many Wayland compositors when
    // the binary is built on a different distro (e.g. Ubuntu CI → Fedora/Bazzite).
    // Disabling it falls back to SHM, which works everywhere.
    #[cfg(target_os = "linux")]
    if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    triggerfish_tidepool::run();
}
