use rusqlite::{Connection, OptionalExtension};
use thiserror::Error;
use sha2::{Digest, Sha256};

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("db error: {0}")]
    Db(String),
}

pub fn verify_password(conn: &Connection, username: &str, master_password: &str) -> Result<bool, AuthError> {
    let stored: Option<String> = conn
        .query_row(
            "SELECT password_hash FROM Users WHERE username = ?1",
            [username],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| AuthError::Db(e.to_string()))?;
    if let Some(stored_hash) = stored {
        let mut hasher = Sha256::new();
        hasher.update(master_password.as_bytes());
        let candidate = format!("{:x}", hasher.finalize());
        Ok(stored_hash == candidate)
    } else {
        Ok(false)
    }
}


