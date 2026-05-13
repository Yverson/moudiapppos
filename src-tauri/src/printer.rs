use std::fs;
use std::process::Command;
use uuid::Uuid;

/// Imprime silencieusement le texte de la facture sur l'imprimante par défaut.
/// Écrit le contenu dans un fichier temporaire unique, puis utilise PowerShell Out-Printer.
#[tauri::command]
pub fn print_receipt(content: String) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let file_name = format!("moudi_receipt_{}.txt", Uuid::new_v4());
    let file_path = temp_dir.join(file_name);

    // Écrire le contenu dans un fichier temporaire unique
    fs::write(&file_path, &content)
        .map_err(|e| format!("Erreur d'écriture du fichier temporaire : {}", e))?;

    // Imprimer via PowerShell (Out-Printer envoie vers l'imprimante par défaut sans dialogue)
    let result = Command::new("powershell")
        .args([
            "-Command",
            &format!(
                "Get-Content -LiteralPath '{}' | Out-Printer",
                file_path.display().to_string().replace('\'', "''")
            ),
        ])
        .output();

    // Nettoyer le fichier temporaire
    let _ = fs::remove_file(&file_path);

    match result {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Échec de l'impression : {}", stderr))
            }
        }
        Err(e) => Err(format!("Impossible de lancer l'impression : {}", e)),
    }
}
