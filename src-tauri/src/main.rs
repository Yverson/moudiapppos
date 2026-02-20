// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use database::Database;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // Initialize database
    let db = Database::new().await.expect("Failed to initialize database");
    let db_arc = Arc::new(db);

    tauri::Builder::default()
        .manage(db_arc)
        .invoke_handler(tauri::generate_handler![
            database::get_categories,
            database::sync_categories,
            database::get_menu_items,
            database::sync_menu_items,
            database::get_customers,
            database::sync_customers,
            database::get_sync_status,
            // Order commands
            database::create_order_offline,
            database::update_order_offline,
            database::get_orders,
            database::get_pending_orders,
            // Cash session commands
            database::get_open_cash_session,
            database::open_cash_session,
            database::close_cash_session,
            // Payment commands
            database::get_order_payments,
            database::complete_order_payment,
            // Sync queue commands
            database::add_to_sync_queue,
            database::get_pending_sync_items,
            database::sync_pending_orders,
            // Livreurs
            database::get_livreurs,
            database::create_livreur,
            database::upsert_livreur,
            database::update_livreur,
            database::delete_livreur,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
