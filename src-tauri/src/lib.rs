mod backup;
mod db;
pub mod engines;
mod error;
mod matches;
mod models;
mod players;
mod queue;
mod rotation;
mod teams;

use players::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let (Some(window), Some(icon)) =
                (app.get_webview_window("main"), app.default_window_icon())
            {
                window.set_icon(icon.clone())?;
            }
            let app_handle = app.handle().clone();

            // Resolve app data dir (platform-appropriate: ~/Library/Application Support/... on macOS,
            // app sandbox container on iOS).
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            tauri::async_runtime::block_on(async move {
                let db_path =
                    db::resolve_db_path(&app_data_dir).expect("failed to resolve db path");

                let pool = db::init_pool(&db_path)
                    .await
                    .expect("failed to initialize database");

                app_handle.manage(DbState(pool));
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            players::get_players,
            players::get_player,
            players::search_players,
            players::create_player,
            players::update_player,
            players::delete_player,
            players::delete_players,
            players::duplicate_player,
            players::set_player_status,
            players::mark_arrived,
            players::unmark_arrived,
            players::import_players,
            backup::export_backup,
            backup::import_backup,
            teams::generate_balanced_teams,
            teams::assign_player_team,
            queue::get_queue,
            queue::reset_arrival_order,
            matches::get_active_match,
            matches::setup_match_teams,
            matches::start_match,
            matches::score_action,
            matches::undo_score,
            matches::reset_scoreboard,
            matches::finish_match,
            matches::cancel_match,
            matches::generate_opponent_team,
            matches::get_match_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
