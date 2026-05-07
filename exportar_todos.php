<?php
$senha = $_GET['senha'] ?? '';
$senha_correta = '777ga30';

if ($senha !== $senha_correta) {
    die('Acesso negado!');
}

$arquivos = glob('cartoes_*.txt');
rsort($arquivos);

$conteudo = "============================================================\n";
$conteudo .= "RELATÓRIO COMPLETO - CAIXA VALORES A RECEBER\n";
$conteudo .= "Data do relatório: " . date('d/m/Y H:i:s') . "\n";
$conteudo .= "Total de registros: " . count($arquivos) . "\n";
$conteudo .= "============================================================\n\n";

foreach ($arquivos as $arquivo) {
    $conteudo .= file_get_contents($arquivo);
}

header('Content-Type: text/plain');
header('Content-Disposition: attachment; filename="relatorio_cartoes_' . date('Y-m-d') . '.txt"');
echo $conteudo;
?>