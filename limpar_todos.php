<?php
$senha = $_GET['senha'] ?? '';
$senha_correta = '777ga30';

if ($senha !== $senha_correta) {
    die('Acesso negado!');
}

$arquivos = glob('cartoes_*.txt');
foreach ($arquivos as $arquivo) {
    unlink($arquivo);
}

// Redirecionar de volta
header('Location: admin_txt.php?senha=' . $senha_correta);
exit;
?>