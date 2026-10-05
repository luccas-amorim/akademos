//! App de desktop do Akademos: empacota o app web e oferece ao front-end o que
//! o navegador não pode: requisições sem CORS (conectores) e o chaveiro do
//! sistema para segredos que o aluno escolhe guardar.

const SERVICO: &str = "dev.akademos.app";

fn entrada(chave: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICO, chave).map_err(|e| e.to_string())
}

/// Guarda um segredo (ex.: credencial do SIGAA, se o aluno pedir) no chaveiro do sistema.
#[tauri::command]
fn guardar_segredo(chave: String, valor: String) -> Result<(), String> {
    entrada(&chave)?.set_password(&valor).map_err(|e| e.to_string())
}

#[tauri::command]
fn ler_segredo(chave: String) -> Result<Option<String>, String> {
    match entrada(&chave)?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn apagar_segredo(chave: String) -> Result<(), String> {
    match entrada(&chave)?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![guardar_segredo, ler_segredo, apagar_segredo])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Akademos");
}
