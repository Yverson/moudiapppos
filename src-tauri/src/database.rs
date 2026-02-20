use sqlx::{SqlitePool, migrate::MigrateDatabase, sqlite::{SqlitePoolOptions, Sqlite}};
use std::sync::Arc;
use tauri::State;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub icon: String,
    pub order: i32,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MenuItem {
    pub id: String,
    pub category_id: String,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub cost_price: f64,
    pub image_url: Option<String>,
    pub available: bool,
    pub allergens: String, // JSON array as string
    pub preparation_time: i32,
    pub order: i32,
    pub variants: String, // JSON array as string
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub email: String,
    pub phone: String,
    pub address: Option<String>, // JSON object as string
    pub customer_type: String, // 'regular', 'vip', 'corporate'
    pub loyalty_points: i32,
    pub total_orders: i32,
    pub total_spent: f64,
    pub preferences: Option<String>, // JSON object as string
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Order {
    pub id: String,
    pub restaurant_id: String,
    pub order_number: Option<String>,
    pub customer_id: Option<String>,
    pub status: String, // 'pending_local', 'confirmed', 'cancelled', etc.
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    pub discount: Option<f64>,
    pub items: String, // JSON array
    pub payment_status: String, // 'pending', 'paid', 'refunded'
    pub payment_method: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub synced_at: Option<String>,
    pub sync_status: String, // 'pending', 'synced', 'error'
    pub sync_error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct OrderItem {
    pub id: String,
    pub order_id: String,
    pub menu_item_id: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub total_price: f64,
    pub variant_name: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncQueue {
    pub id: String,
    pub action: String, // 'CREATE_ORDER', 'UPDATE_ORDER', etc.
    pub entity_type: String, // 'order', 'customer', etc.
    pub entity_id: String,
    pub data: String, // JSON payload
    pub retries: i32,
    pub max_retries: i32,
    pub last_attempt: Option<String>,
    pub status: String, // 'pending', 'processing', 'synced', 'error', 'failed'
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct CashSession {
    pub id: String,
    pub restaurant_id: String,
    pub opened_at: String,
    pub opened_by: Option<String>,
    pub opening_amount: f64,
    pub closed_at: Option<String>,
    pub closed_by: Option<String>,
    pub closing_amount: Option<f64>,
    pub status: String, // open, closed
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Payment {
    pub id: String,
    pub order_id: String,
    pub cash_session_id: Option<String>,
    pub method: String, // cash, card, mobile_money
    pub amount: f64,
    pub tendered: Option<f64>,
    pub change: Option<f64>,
    pub status: String, // pending, completed, failed, refunded
    pub transaction_id: Option<String>,
    pub metadata: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteOrderPaymentRequest {
    pub order_id: String,
    pub restaurant_id: String,
    pub cash_session_id: Option<String>,
    pub payments: Vec<PaymentInput>,
    pub paid_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentInput {
    pub method: String,
    pub amount: f64,
    pub tendered: Option<f64>,
    pub change: Option<f64>,
    pub transaction_id: Option<String>,
    pub metadata: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompleteOrderPaymentResult {
    pub order_id: String,
    pub total_due: f64,
    pub total_paid: f64,
    pub payment_status: String,
    pub payment_method: Option<String>,
    pub payments: Vec<Payment>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Livreur {
    pub id: String,
    pub restaurant_id: String,
    pub nom: String,
    pub prenom: String,
    pub telephone: Option<String>,
    pub email: Option<String>,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
}

pub struct Database {
    pool: Arc<SqlitePool>,
}

impl Database {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let database_url = "sqlite:./appdata.db".to_string();
        
        // Create database if it doesn't exist
        if !Sqlite::database_exists(&database_url).await? {
            Sqlite::create_database(&database_url).await?;
        }

        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .connect(&database_url)
            .await?;

        // Run migrations
        sqlx::migrate!("./migrations").run(&pool).await?;

        Ok(Database {
            pool: Arc::new(pool),
        })
    }

    // Categories
    pub async fn get_categories(&self) -> Result<Vec<Category>, sqlx::Error> {
        let categories = sqlx::query_as::<_, Category>(
            "SELECT * FROM categories ORDER BY `order` ASC"
        )
        .fetch_all(&*self.pool)
        .await?;
        Ok(categories)
    }

    pub async fn upsert_category(&self, category: &Category) -> Result<Category, sqlx::Error> {
        let result = sqlx::query_as::<_, Category>(
            r#"
            INSERT OR REPLACE INTO categories 
            (id, name, description, color, icon, `order`, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&category.id)
        .bind(&category.name)
        .bind(&category.description)
        .bind(&category.color)
        .bind(&category.icon)
        .bind(category.order)
        .bind(category.active)
        .bind(&category.created_at)
        .bind(&category.updated_at)
        .fetch_one(&*self.pool)
        .await?;
        
        Ok(result)
    }

    pub async fn update_order(&self, order: &Order) -> Result<Order, sqlx::Error> {
        let result = sqlx::query_as::<_, Order>(
            r#"
            UPDATE orders
            SET
              restaurant_id = ?,
              order_number = ?,
              customer_id = ?,
              status = ?,
              subtotal = ?,
              tax = ?,
              total = ?,
              discount = ?,
              items = ?,
              payment_status = ?,
              payment_method = ?,
              notes = ?,
              updated_at = ?,
              synced_at = ?,
              sync_status = ?,
              sync_error = ?
            WHERE id = ?
            RETURNING *
            "#
        )
        .bind(&order.restaurant_id)
        .bind(&order.order_number)
        .bind(&order.customer_id)
        .bind(&order.status)
        .bind(order.subtotal)
        .bind(order.tax)
        .bind(order.total)
        .bind(order.discount)
        .bind(&order.items)
        .bind(&order.payment_status)
        .bind(&order.payment_method)
        .bind(&order.notes)
        .bind(&order.updated_at)
        .bind(&order.synced_at)
        .bind(&order.sync_status)
        .bind(&order.sync_error)
        .bind(&order.id)
        .fetch_one(&*self.pool)
        .await?;

        Ok(result)
    }

    #[allow(dead_code)]
    pub async fn delete_category(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM categories WHERE id = ?")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    // Menu Items
    pub async fn get_menu_items(&self, category_id: Option<&str>) -> Result<Vec<MenuItem>, sqlx::Error> {
        let items = if let Some(cat_id) = category_id {
            sqlx::query_as::<_, MenuItem>(
                "SELECT * FROM menu_items WHERE category_id = ? ORDER BY `order` ASC"
            )
            .bind(cat_id)
            .fetch_all(&*self.pool)
            .await?
        } else {
            sqlx::query_as::<_, MenuItem>(
                "SELECT * FROM menu_items ORDER BY `order` ASC"
            )
            .fetch_all(&*self.pool)
            .await?
        };
        Ok(items)
    }

    pub async fn upsert_menu_item(&self, item: &MenuItem) -> Result<MenuItem, sqlx::Error> {
        let result = sqlx::query_as::<_, MenuItem>(
            r#"
            INSERT OR REPLACE INTO menu_items 
            (id, category_id, name, description, price, cost_price, image_url, available, 
             allergens, preparation_time, `order`, variants, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&item.id)
        .bind(&item.category_id)
        .bind(&item.name)
        .bind(&item.description)
        .bind(item.price)
        .bind(item.cost_price)
        .bind(&item.image_url)
        .bind(item.available)
        .bind(&item.allergens)
        .bind(item.preparation_time)
        .bind(item.order)
        .bind(&item.variants)
        .bind(&item.created_at)
        .bind(&item.updated_at)
        .fetch_one(&*self.pool)
        .await?;
        
        Ok(result)
    }

    #[allow(dead_code)]
    pub async fn delete_menu_item(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM menu_items WHERE id = ?")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    // Customers
    pub async fn get_customers(&self) -> Result<Vec<Customer>, sqlx::Error> {
        let customers = sqlx::query_as::<_, Customer>(
            "SELECT * FROM customers ORDER BY name ASC"
        )
        .fetch_all(&*self.pool)
        .await?;
        Ok(customers)
    }

    pub async fn upsert_customer(&self, customer: &Customer) -> Result<Customer, sqlx::Error> {
        let result = sqlx::query_as::<_, Customer>(
            r#"
            INSERT OR REPLACE INTO customers 
            (id, name, email, phone, address, customer_type, loyalty_points, total_orders, 
             total_spent, preferences, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&customer.id)
        .bind(&customer.name)
        .bind(&customer.email)
        .bind(&customer.phone)
        .bind(&customer.address)
        .bind(&customer.customer_type)
        .bind(customer.loyalty_points)
        .bind(customer.total_orders)
        .bind(customer.total_spent)
        .bind(&customer.preferences)
        .bind(&customer.notes)
        .bind(&customer.created_at)
        .bind(&customer.updated_at)
        .fetch_one(&*self.pool)
        .await?;
        
        Ok(result)
    }

    #[allow(dead_code)]
    pub async fn delete_customer(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM customers WHERE id = ?")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    // Sync operations
    pub async fn get_last_sync_time(&self, table: &str) -> Result<Option<DateTime<Utc>>, sqlx::Error> {
        let result: Option<(String,)> = sqlx::query_as(
            "SELECT updated_at FROM sync_status WHERE table_name = ?"
        )
        .bind(table)
        .fetch_optional(&*self.pool)
        .await?;
        
        match result {
            Some((date_str,)) => {
                let dt = DateTime::parse_from_rfc3339(&date_str)
                    .map_err(|_| sqlx::Error::Decode("Invalid date format".into()))?;
                Ok(Some(dt.with_timezone(&Utc)))
            }
            None => Ok(None),
        }
    }

    pub async fn update_sync_time(&self, table: &str) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        sqlx::query(
            "INSERT OR REPLACE INTO sync_status (table_name, updated_at) VALUES (?, ?)"
        )
        .bind(table)
        .bind(&now)
        .execute(&*self.pool)
        .await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn clear_table(&self, table: &str) -> Result<(), sqlx::Error> {
        match table {
            "categories" => sqlx::query("DELETE FROM categories").execute(&*self.pool).await?,
            "menu_items" => sqlx::query("DELETE FROM menu_items").execute(&*self.pool).await?,
            "customers" => sqlx::query("DELETE FROM customers").execute(&*self.pool).await?,
            _ => return Err(sqlx::Error::Protocol("Invalid table name".into())),
        };
        Ok(())
    }

    // Orders
    pub async fn create_order(&self, order: &Order) -> Result<Order, sqlx::Error> {
        let result = sqlx::query_as::<_, Order>(
            r#"
            INSERT INTO orders 
            (id, restaurant_id, order_number, customer_id, status, subtotal, tax, total, 
             discount, items, payment_status, payment_method, notes, created_at, updated_at, 
             synced_at, sync_status, sync_error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&order.id)
        .bind(&order.restaurant_id)
        .bind(&order.order_number)
        .bind(&order.customer_id)
        .bind(&order.status)
        .bind(order.subtotal)
        .bind(order.tax)
        .bind(order.total)
        .bind(order.discount)
        .bind(&order.items)
        .bind(&order.payment_status)
        .bind(&order.payment_method)
        .bind(&order.notes)
        .bind(&order.created_at)
        .bind(&order.updated_at)
        .bind(&order.synced_at)
        .bind(&order.sync_status)
        .bind(&order.sync_error)
        .fetch_one(&*self.pool)
        .await?;
        
        Ok(result)
    }

    pub async fn get_orders(&self, restaurant_id: &str, status: Option<&str>) -> Result<Vec<Order>, sqlx::Error> {
        let orders = if let Some(status_filter) = status {
            sqlx::query_as::<_, Order>(
                "SELECT * FROM orders WHERE restaurant_id = ? AND status = ? ORDER BY created_at DESC"
            )
            .bind(restaurant_id)
            .bind(status_filter)
            .fetch_all(&*self.pool)
            .await?
        } else {
            sqlx::query_as::<_, Order>(
                "SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC"
            )
            .bind(restaurant_id)
            .fetch_all(&*self.pool)
            .await?
        };
        Ok(orders)
    }

    pub async fn get_pending_orders(&self, restaurant_id: &str) -> Result<Vec<Order>, sqlx::Error> {
        let orders = sqlx::query_as::<_, Order>(
            "SELECT * FROM orders WHERE restaurant_id = ? AND sync_status = 'pending' ORDER BY created_at ASC"
        )
        .bind(restaurant_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(orders)
    }

    pub async fn update_order_sync_status(&self, order_id: &str, sync_status: &str, sync_error: Option<&str>) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let query = if sync_status == "synced" {
            sqlx::query("UPDATE orders SET sync_status = ?, synced_at = ?, sync_error = NULL, updated_at = ? WHERE id = ?")
        } else {
            sqlx::query("UPDATE orders SET sync_status = ?, sync_error = ?, updated_at = ? WHERE id = ?")
        };
        
        query
            .bind(sync_status)
            .bind(sync_error.unwrap_or(""))
            .bind(&now)
            .bind(order_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    // Sync Queue
    pub async fn add_to_sync_queue(&self, queue_item: &SyncQueue) -> Result<SyncQueue, sqlx::Error> {
        let result = sqlx::query_as::<_, SyncQueue>(
            r#"
            INSERT INTO sync_queue 
            (id, action, entity_type, entity_id, data, retries, max_retries, last_attempt, 
             status, error_message, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&queue_item.id)
        .bind(&queue_item.action)
        .bind(&queue_item.entity_type)
        .bind(&queue_item.entity_id)
        .bind(&queue_item.data)
        .bind(queue_item.retries)
        .bind(queue_item.max_retries)
        .bind(&queue_item.last_attempt)
        .bind(&queue_item.status)
        .bind(&queue_item.error_message)
        .bind(&queue_item.created_at)
        .bind(&queue_item.updated_at)
        .fetch_one(&*self.pool)
        .await?;
        
        Ok(result)
    }

    pub async fn get_pending_sync_items(&self) -> Result<Vec<SyncQueue>, sqlx::Error> {
        let items = sqlx::query_as::<_, SyncQueue>(
            "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC"
        )
        .fetch_all(&*self.pool)
        .await?;
        Ok(items)
    }

    #[allow(dead_code)]
    pub async fn update_sync_queue_status(&self, item_id: &str, status: &str, error_message: Option<&str>) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let query = if status == "synced" {
            sqlx::query("UPDATE sync_queue SET status = ?, error_message = NULL, updated_at = ? WHERE id = ?")
        } else {
            sqlx::query("UPDATE sync_queue SET status = ?, error_message = ?, updated_at = ? WHERE id = ?")
        };
        
        query
            .bind(status)
            .bind(error_message.unwrap_or(""))
            .bind(&now)
            .bind(item_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn increment_sync_retries(&self, item_id: &str) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        sqlx::query("UPDATE sync_queue SET retries = retries + 1, last_attempt = ?, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(&now)
            .bind(item_id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }

    // Cash session
    pub async fn get_open_cash_session(&self, restaurant_id: &str) -> Result<Option<CashSession>, sqlx::Error> {
        let session = sqlx::query_as::<_, CashSession>(
            "SELECT * FROM cash_sessions WHERE restaurant_id = ? AND status = 'open' ORDER BY opened_at DESC LIMIT 1"
        )
        .bind(restaurant_id)
        .fetch_optional(&*self.pool)
        .await?;
        Ok(session)
    }

    pub async fn open_cash_session(&self, session: &CashSession) -> Result<CashSession, sqlx::Error> {
        let result = sqlx::query_as::<_, CashSession>(
            r#"
            INSERT INTO cash_sessions
            (id, restaurant_id, opened_at, opened_by, opening_amount, closed_at, closed_by, closing_amount, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#
        )
        .bind(&session.id)
        .bind(&session.restaurant_id)
        .bind(&session.opened_at)
        .bind(&session.opened_by)
        .bind(session.opening_amount)
        .bind(&session.closed_at)
        .bind(&session.closed_by)
        .bind(&session.closing_amount)
        .bind(&session.status)
        .bind(&session.notes)
        .bind(&session.created_at)
        .bind(&session.updated_at)
        .fetch_one(&*self.pool)
        .await?;

        Ok(result)
    }

    pub async fn close_cash_session(
        &self,
        session_id: &str,
        closed_by: Option<&str>,
        closing_amount: f64,
        closed_at: &str,
        notes: Option<&str>,
    ) -> Result<CashSession, sqlx::Error> {
        let updated = sqlx::query_as::<_, CashSession>(
            r#"
            UPDATE cash_sessions
            SET status = 'closed', closed_at = ?, closed_by = ?, closing_amount = ?, notes = ?, updated_at = ?
            WHERE id = ?
            RETURNING *
            "#
        )
        .bind(closed_at)
        .bind(closed_by)
        .bind(closing_amount)
        .bind(notes)
        .bind(closed_at)
        .bind(session_id)
        .fetch_one(&*self.pool)
        .await?;

        Ok(updated)
    }

    // Payments
    pub async fn get_order_payments(&self, order_id: &str) -> Result<Vec<Payment>, sqlx::Error> {
        let payments = sqlx::query_as::<_, Payment>(
            "SELECT * FROM payments WHERE order_id = ? ORDER BY created_at ASC"
        )
        .bind(order_id)
        .fetch_all(&*self.pool)
        .await?;
        Ok(payments)
    }

    pub async fn complete_order_payment(&self, req: &CompleteOrderPaymentRequest) -> Result<CompleteOrderPaymentResult, sqlx::Error> {
        if req.payments.is_empty() {
            return Err(sqlx::Error::Protocol("No payments provided".into()));
        }

        let mut total_paid = 0.0_f64;
        for p in &req.payments {
            if p.amount <= 0.0 {
                return Err(sqlx::Error::Protocol("Payment amount must be > 0".into()));
            }
            if p.method != "cash" && p.method != "card" && p.method != "mobile_money" {
                return Err(sqlx::Error::Protocol("Invalid payment method".into()));
            }
            if p.method == "cash" {
                let tendered = p.tendered.unwrap_or(0.0);
                if tendered < p.amount {
                    return Err(sqlx::Error::Protocol("Cash tendered must be >= amount".into()));
                }
            }
            total_paid += p.amount;
        }

        let mut tx = self.pool.begin().await?;

        // Load order
        let order: Order = sqlx::query_as::<_, Order>("SELECT * FROM orders WHERE id = ?")
            .bind(&req.order_id)
            .fetch_one(&mut *tx)
            .await?;

        if order.restaurant_id != req.restaurant_id {
            return Err(sqlx::Error::Protocol("Order restaurant_id mismatch".into()));
        }

        let total_due = order.total;
        if total_paid + 0.000_001 < total_due {
            return Err(sqlx::Error::Protocol("Total paid is less than total due".into()));
        }

        // Insert payments
        let mut saved_payments: Vec<Payment> = Vec::new();
        for p in &req.payments {
            let now = req.paid_at.clone();
            let payment_id = uuid::Uuid::new_v4().to_string();
            let saved = sqlx::query_as::<_, Payment>(
                r#"
                INSERT INTO payments
                (id, order_id, cash_session_id, method, amount, tendered, change, status, transaction_id, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)
                RETURNING *
                "#
            )
            .bind(&payment_id)
            .bind(&req.order_id)
            .bind(&req.cash_session_id)
            .bind(&p.method)
            .bind(p.amount)
            .bind(p.tendered)
            .bind(p.change)
            .bind(&p.transaction_id)
            .bind(&p.metadata)
            .bind(&now)
            .bind(&now)
            .fetch_one(&mut *tx)
            .await?;

            saved_payments.push(saved);
        }

        // Update order payment fields
        let payment_method_summary = if req.payments.len() == 1 {
            Some(req.payments[0].method.clone())
        } else {
            Some("split".to_string())
        };

        let now = req.paid_at.clone();
        let updated_order: Order = sqlx::query_as::<_, Order>(
            r#"
            UPDATE orders
            SET payment_status = 'paid', payment_method = ?, updated_at = ?
            WHERE id = ?
            RETURNING *
            "#
        )
        .bind(&payment_method_summary)
        .bind(&now)
        .bind(&req.order_id)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(CompleteOrderPaymentResult {
            order_id: updated_order.id,
            total_due,
            total_paid,
            payment_status: updated_order.payment_status,
            payment_method: updated_order.payment_method,
            payments: saved_payments,
        })
    }
}

// Tauri commands
#[tauri::command]
pub async fn get_categories(db: State<'_, Arc<Database>>) -> Result<Vec<Category>, String> {
    db.get_categories().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_categories(db: State<'_, Arc<Database>>, categories: Vec<Category>) -> Result<Vec<Category>, String> {
    let mut results = Vec::new();
    
    for category in categories {
        match db.upsert_category(&category).await {
            Ok(saved) => results.push(saved),
            Err(e) => return Err(e.to_string()),
        }
    }
    
    db.update_sync_time("categories").await.map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
pub async fn get_menu_items(db: State<'_, Arc<Database>>, category_id: Option<String>) -> Result<Vec<MenuItem>, String> {
    let cat_id = category_id.as_deref();
    db.get_menu_items(cat_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_menu_items(db: State<'_, Arc<Database>>, items: Vec<MenuItem>) -> Result<Vec<MenuItem>, String> {
    let mut results = Vec::new();
    
    for item in items {
        match db.upsert_menu_item(&item).await {
            Ok(saved) => results.push(saved),
            Err(e) => return Err(e.to_string()),
        }
    }
    
    db.update_sync_time("menu_items").await.map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
pub async fn get_customers(db: State<'_, Arc<Database>>) -> Result<Vec<Customer>, String> {
    db.get_customers().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_customers(db: State<'_, Arc<Database>>, customers: Vec<Customer>) -> Result<Vec<Customer>, String> {
    let mut results = Vec::new();
    
    for customer in customers {
        match db.upsert_customer(&customer).await {
            Ok(saved) => results.push(saved),
            Err(e) => return Err(e.to_string()),
        }
    }
    
    db.update_sync_time("customers").await.map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
pub async fn get_sync_status(db: State<'_, Arc<Database>>) -> Result<std::collections::HashMap<String, Option<String>>, String> {
    let mut status = std::collections::HashMap::new();
    
    let tables = ["categories", "menu_items", "customers"];
    for table in tables {
        match db.get_last_sync_time(table).await {
            Ok(Some(dt)) => {
                status.insert(table.to_string(), Some(dt.to_rfc3339()));
            }
            Ok(None) => {
                status.insert(table.to_string(), None);
            }
            Err(e) => return Err(e.to_string()),
        }
    }
    
    Ok(status)
}

// Order commands
#[tauri::command]
pub async fn create_order_offline(db: State<'_, Arc<Database>>, order: Order) -> Result<Order, String> {
    db.create_order(&order).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_order_offline(db: State<'_, Arc<Database>>, order: Order) -> Result<Order, String> {
    db.update_order(&order).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_orders(db: State<'_, Arc<Database>>, restaurant_id: String, status: Option<String>) -> Result<Vec<Order>, String> {
    let status_filter = status.as_deref();
    db.get_orders(&restaurant_id, status_filter).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_pending_orders(db: State<'_, Arc<Database>>, restaurant_id: String) -> Result<Vec<Order>, String> {
    db.get_pending_orders(&restaurant_id).await.map_err(|e| e.to_string())
}

// Cash session commands
#[tauri::command]
pub async fn get_open_cash_session(db: State<'_, Arc<Database>>, restaurant_id: String) -> Result<Option<CashSession>, String> {
    db.get_open_cash_session(&restaurant_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn open_cash_session(db: State<'_, Arc<Database>>, session: CashSession) -> Result<CashSession, String> {
    // Ensure only one open session per restaurant
    if let Ok(Some(_existing)) = db.get_open_cash_session(&session.restaurant_id).await {
        return Err("A cash session is already open for this restaurant".to_string());
    }
    db.open_cash_session(&session).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn close_cash_session(
    db: State<'_, Arc<Database>>,
    session_id: String,
    closed_by: Option<String>,
    closing_amount: f64,
    closed_at: String,
    notes: Option<String>,
) -> Result<CashSession, String> {
    db.close_cash_session(&session_id, closed_by.as_deref(), closing_amount, &closed_at, notes.as_deref())
        .await
        .map_err(|e| e.to_string())
}

// Payment commands
#[tauri::command]
pub async fn get_order_payments(db: State<'_, Arc<Database>>, order_id: String) -> Result<Vec<Payment>, String> {
    db.get_order_payments(&order_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn complete_order_payment(db: State<'_, Arc<Database>>, request: CompleteOrderPaymentRequest) -> Result<CompleteOrderPaymentResult, String> {
    db.complete_order_payment(&request).await.map_err(|e| e.to_string())
}

// Sync queue commands
#[tauri::command]
pub async fn add_to_sync_queue(db: State<'_, Arc<Database>>, queue_item: SyncQueue) -> Result<SyncQueue, String> {
    db.add_to_sync_queue(&queue_item).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_pending_sync_items(db: State<'_, Arc<Database>>) -> Result<Vec<SyncQueue>, String> {
    db.get_pending_sync_items().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_pending_orders(db: State<'_, Arc<Database>>, restaurant_id: String, api_url: String) -> Result<serde_json::Value, String> {
    // Get pending orders
    let pending_orders = db.get_pending_orders(&restaurant_id).await.map_err(|e| e.to_string())?;
    
    let mut synced_count = 0;
    let mut error_count = 0;
    let mut errors = Vec::new();
    
    for order in pending_orders {
        // Try to sync order to API
        match sync_order_to_api(&order, &api_url).await {
            Ok(_) => {
                // Update order sync status
                db.update_order_sync_status(&order.id, "synced", None).await.map_err(|e| e.to_string())?;
                synced_count += 1;
            }
            Err(e) => {
                // Update order with error
                db.update_order_sync_status(&order.id, "error", Some(&e)).await.map_err(|e| e.to_string())?;
                error_count += 1;
                errors.push(format!("Order {}: {}", order.id, e));
            }
        }
    }
    
    Ok(serde_json::json!({
        "synced": synced_count,
        "errors": error_count,
        "error_details": errors
    }))
}

// Helper function to sync order to API
async fn sync_order_to_api(order: &Order, api_url: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/orders", api_url);
    
    // Parse order items from JSON
    let items: serde_json::Value = serde_json::from_str(&order.items)
        .map_err(|e| format!("Failed to parse order items: {}", e))?;
    
    // Create API request payload
    let payload = serde_json::json!({
        "id": order.id,
        "restaurant_id": order.restaurant_id,
        "customer_id": order.customer_id,
        "status": "pending",
        "subtotal": order.subtotal,
        "tax": order.tax,
        "total": order.total,
        "discount": order.discount,
        "items": items,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "notes": order.notes,
        "created_at": order.created_at
    });
    
    // Send to API
    let response = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send order to API: {}", e))?;
    
    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        Err(format!("API error {}: {}", status, text))
    }
}

// Livreurs methods
impl Database {
    pub async fn get_livreurs(&self, restaurant_id: &str, active_only: bool) -> Result<Vec<Livreur>, sqlx::Error> {
        let query = if active_only {
            "SELECT * FROM livreurs WHERE restaurant_id = ? AND active = 1 ORDER BY nom ASC, prenom ASC"
        } else {
            "SELECT * FROM livreurs WHERE restaurant_id = ? ORDER BY nom ASC, prenom ASC"
        };
        
        let livreurs = sqlx::query_as::<_, Livreur>(query)
            .bind(restaurant_id)
            .fetch_all(&*self.pool)
            .await?;
        Ok(livreurs)
    }

    pub async fn upsert_livreur(&self, livreur: Livreur) -> Result<Livreur, sqlx::Error> {
        let livreur = sqlx::query_as::<_, Livreur>(
            "INSERT OR REPLACE INTO livreurs (id, restaurant_id, nom, prenom, telephone, email, active, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             RETURNING *"
        )
        .bind(&livreur.id)
        .bind(&livreur.restaurant_id)
        .bind(&livreur.nom)
        .bind(&livreur.prenom)
        .bind(&livreur.telephone)
        .bind(&livreur.email)
        .bind(&livreur.active)
        .bind(&livreur.created_at)
        .bind(&livreur.updated_at)
        .fetch_one(&*self.pool)
        .await?;
        Ok(livreur)
    }

    pub async fn update_livreur(&self, livreur: &Livreur) -> Result<Livreur, sqlx::Error> {
        let result = sqlx::query_as::<_, Livreur>(
            "UPDATE livreurs SET nom = ?1, prenom = ?2, telephone = ?3, email = ?4, active = ?5, updated_at = ?6 WHERE id = ?7 RETURNING *"
        )
        .bind(&livreur.nom)
        .bind(&livreur.prenom)
        .bind(&livreur.telephone)
        .bind(&livreur.email)
        .bind(livreur.active)
        .bind(&livreur.updated_at)
        .bind(&livreur.id)
        .fetch_one(&*self.pool)
        .await?;
        Ok(result)
    }

    pub async fn delete_livreur(&self, id: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM livreurs WHERE id = ?1")
            .bind(id)
            .execute(&*self.pool)
            .await?;
        Ok(())
    }
}

// Tauri commands for Livreurs
#[tauri::command]
pub async fn get_livreurs(db: State<'_, Arc<Database>>, restaurant_id: String, active_only: Option<bool>) -> Result<Vec<Livreur>, String> {
    db.get_livreurs(&restaurant_id, active_only.unwrap_or(false))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_livreur(db: State<'_, Arc<Database>>, livreur: Livreur) -> Result<Livreur, String> {
    db.upsert_livreur(livreur).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upsert_livreur(db: State<'_, Arc<Database>>, livreur: Livreur) -> Result<Livreur, String> {
    db.upsert_livreur(livreur).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_livreur(db: State<'_, Arc<Database>>, livreur: Livreur) -> Result<Livreur, String> {
    db.update_livreur(&livreur).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_livreur(db: State<'_, Arc<Database>>, id: String) -> Result<(), String> {
    db.delete_livreur(&id).await.map_err(|e| e.to_string())
}
