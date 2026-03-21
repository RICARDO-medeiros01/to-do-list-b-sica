// ============================================================
// DADOS
// ============================================================
var tarefas = [];
var proximoId = 1;
var filtroAtivo = 'todas';
var editandoId = null;


// ============================================================
// TOASTS (mensagens saltitantes)
// ============================================================
function mostrarToast(titulo, mensagem, tipo) {
    // CORRIGIDO: era 'toast-container' → agora 'mensagens-saltitantes'
    var c = document.getElementById('mensagens-saltitantes');
    var t = document.createElement('div');
    t.className = 'toast' + (tipo ? ' ' + tipo : '');
    t.innerHTML = '<div class="toast-titulo">' + titulo + '</div>'
        + '<div class="toast-msg">' + (mensagem || '') + '</div>';
    c.appendChild(t);
    setTimeout(function () {
        t.style.animation = 'toast-out 0.22s ease forwards';
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    }, 3800);
}


// ============================================================
// NOTIFICAÇÕES
// ============================================================
function ativarNotificacoes() {
    if (!('Notification' in window)) {
        mostrarToast('Não suportado', 'Seu navegador não suporta notificações.', 'erro');
        return;
    }
    if (Notification.permission === 'granted') {
        verificarPrazos();
        mostrarToast('🔔 Notificações ativas', 'Verificando tarefas com prazo próximo...', '');
        return;
    }
    if (Notification.permission === 'denied') {
        mostrarToast('Notificações bloqueadas', 'Permita nas configurações do navegador.', 'erro');
        return;
    }
    Notification.requestPermission(function (p) {
        if (p === 'granted') {
            // Adiciona classe .ativo no botão de notificações
            document.getElementById('btn-notif').classList.add('ativo');
            mostrarToast('✓ Notificações ativadas!', 'Você receberá alertas de prazo.', '');
            verificarPrazos();
        } else {
            mostrarToast('Permissão negada', 'Notificações não foram permitidas.', 'aviso');
        }
    });
}

function verificarPrazos() {
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    var atrasadas = [], vencemHoje = [], vencemAmanha = [];

    for (var i = 0; i < tarefas.length; i++) {
        var t = tarefas[i];
        if (!t.data || t.concluida) continue;
        var d = new Date(t.data + 'T00:00:00');
        if (d < hoje) atrasadas.push(t);
        else if (d.getTime() === hoje.getTime()) vencemHoje.push(t);
        else if (d.getTime() === amanha.getTime()) vencemAmanha.push(t);
    }

    if (!atrasadas.length && !vencemHoje.length && !vencemAmanha.length) {
        mostrarToast('Tudo em dia! ✓', 'Nenhuma tarefa com prazo próximo.', '');
        return;
    }

    if (Notification.permission === 'granted') {
        var linhas = [];
        if (atrasadas.length) linhas.push(atrasadas.length + ' atrasada(s)');
        if (vencemHoje.length) linhas.push(vencemHoje.length + ' vencem hoje');
        if (vencemAmanha.length) linhas.push(vencemAmanha.length + ' vencem amanhã');
        new Notification('📋 Gerenciador de Tarefas', { body: linhas.join(' · ') });
    }

    if (atrasadas.length)
        mostrarToast('⚠ Tarefas atrasadas', atrasadas.map(function (x) { return '• ' + x.titulo; }).join('<br>'), 'erro');
    if (vencemHoje.length)
        mostrarToast('🕐 Vencem hoje', vencemHoje.map(function (x) { return '• ' + x.titulo; }).join('<br>'), 'aviso');
    if (vencemAmanha.length)
        mostrarToast('📅 Vencem amanhã', vencemAmanha.map(function (x) { return '• ' + x.titulo; }).join('<br>'), '');
}

function atualizarBotaoNotif() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted')
        document.getElementById('btn-notif').classList.add('ativo');
}


// ============================================================
// EXPORTAR PDF
// ============================================================
function exportarPDF() {
    if (tarefas.length === 0) {
        mostrarToast('Lista vazia', 'Adicione tarefas antes de exportar.', 'aviso');
        return;
    }
    if (typeof window.jspdf === 'undefined') {
        mostrarToast('Erro', 'Biblioteca PDF não carregou. Verifique sua conexão.', 'erro');
        return;
    }

    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    var mg = 20;
    var largura = 210;
    var y = 20;

    // Cabeçalho azul
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Gerenciador de Tarefas', mg, 17);

    var agora = new Date();
    var dtStr = agora.toLocaleDateString('pt-BR') + ' ' +
        agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 220, 255);
    doc.text('Gerado em ' + dtStr, largura - mg, 17, { align: 'right' });

    y = 38;
    var pend = tarefas.filter(function (t) { return !t.concluida; }).length;
    var conc = tarefas.filter(function (t) { return t.concluida; }).length;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(tarefas.length + ' tarefas  ·  ' + pend + ' pendentes  ·  ' + conc + ' concluídas', mg, y);
    y += 8;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(mg, y, largura - mg, y);
    y += 8;

    var ordemPrio = { alta: 0, media: 1, baixa: 2 };
    var lista = tarefas.slice().sort(function (a, b) {
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        return ordemPrio[a.prioridade] - ordemPrio[b.prioridade];
    });

    for (var i = 0; i < lista.length; i++) {
        var t = lista[i];
        var linhasDesc = t.descricao ? Math.ceil(t.descricao.length / 85) : 0;
        var alturaCard = 18 + (linhasDesc ? linhasDesc * 5 + 4 : 0);

        if (y + alturaCard > 278) { doc.addPage(); y = 20; }

        // Card branco com borda
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(mg, y, largura - mg * 2, alturaCard, 3, 3, 'FD');

        // Faixa lateral de prioridade
        var cor = t.prioridade === 'alta' ? [239, 68, 68] :
            t.prioridade === 'media' ? [245, 158, 11] :
                [34, 197, 94];
        doc.setFillColor(cor[0], cor[1], cor[2]);
        doc.roundedRect(mg, y, 3, alturaCard, 1.5, 1.5, 'F');

        var xT = mg + 8;
        var yT = y + 9;

        // Checkbox
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(t.concluida ? 148 : 37, t.concluida ? 148 : 99, t.concluida ? 148 : 235);
        doc.text(t.concluida ? '[✓]' : '[ ]', xT, yT);

        // Título
        doc.setFont('helvetica', t.concluida ? 'normal' : 'bold');
        doc.setFontSize(10);
        doc.setTextColor(t.concluida ? 148 : 30, t.concluida ? 148 : 41, t.concluida ? 148 : 59);
        doc.text(t.titulo, xT + 9, yT);

        // Prioridade e data (direita)
        var prioLabel = t.prioridade.charAt(0).toUpperCase() + t.prioridade.slice(1);
        var info = prioLabel + (t.data ? '  |  ' + formatarData(t.data) : '');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(cor[0], cor[1], cor[2]);
        doc.text(info, largura - mg - 3, yT, { align: 'right' });

        // Descrição
        if (t.descricao) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            var linhas = doc.splitTextToSize(t.descricao, largura - mg * 2 - 16);
            doc.text(linhas, xT + 9, yT + 6);
        }

        y += alturaCard + 4;
    }

    doc.save('tarefas.pdf');
    mostrarToast('✓ PDF exportado!', 'O download começou automaticamente.', '');
}


// ============================================================
// ADICIONAR TAREFA (formulário principal)
// ============================================================
function adicionarTarefa() {
    var titulo = document.getElementById('campo-titulo').value.trim();
    var descricao = document.getElementById('campo-desc').value.trim();
    var data = document.getElementById('campo-data').value;
    var prioridade = document.getElementById('campo-prioridade').value;

    document.getElementById('erro-titulo').style.display = 'none';

    if (titulo === '') {
        document.getElementById('erro-titulo').style.display = 'block';
        document.getElementById('campo-titulo').focus();
        return;
    }

    tarefas.push({
        id: proximoId,
        titulo: titulo,
        descricao: descricao,
        data: data,
        prioridade: prioridade,
        concluida: false
    });
    proximoId++;

    // Limpa o formulário
    document.getElementById('campo-titulo').value = '';
    document.getElementById('campo-desc').value = '';
    document.getElementById('campo-data').value = '';
    document.getElementById('campo-prioridade').value = 'media';

    mostrarToast('✓ Tarefa adicionada', titulo, '');

    if (data && Notification.permission === 'granted') verificarPrazos();

    renderizar();
    document.getElementById('campo-titulo').focus();
}


// ============================================================
// EDITAR — abre modal preenchido
// ============================================================
function abrirEdicao(id) {
    editandoId = id;
    var t = buscarPorId(id);

    document.getElementById('modal-titulo').textContent = 'Editar Tarefa';
    document.getElementById('modal-titulo-campo').value = t.titulo;
    document.getElementById('modal-desc').value = t.descricao;
    document.getElementById('modal-data').value = t.data;
    document.getElementById('modal-prioridade').value = t.prioridade;
    document.getElementById('modal-erro-titulo').style.display = 'none';

    document.getElementById('overlay').classList.add('aberto');
    document.getElementById('modal-titulo-campo').focus();
}

function salvarEdicao() {
    var titulo = document.getElementById('modal-titulo-campo').value.trim();
    if (titulo === '') {
        document.getElementById('modal-erro-titulo').style.display = 'block';
        document.getElementById('modal-titulo-campo').focus();
        return;
    }

    for (var i = 0; i < tarefas.length; i++) {
        if (tarefas[i].id === editandoId) {
            tarefas[i].titulo = titulo;
            tarefas[i].descricao = document.getElementById('modal-desc').value.trim();
            tarefas[i].data = document.getElementById('modal-data').value;
            tarefas[i].prioridade = document.getElementById('modal-prioridade').value;
            break;
        }
    }

    fecharModal();
    mostrarToast('✓ Tarefa atualizada', titulo, '');
    renderizar();
}

function fecharModal() {
    document.getElementById('overlay').classList.remove('aberto');
}

function fecharModalFora(e) {
    if (e.target === document.getElementById('overlay')) fecharModal();
}


// ============================================================
// CONCLUIR / DELETAR / FILTRAR
// ============================================================
function concluirTarefa(id) {
    var t = buscarPorId(id);
    if (t) {
        t.concluida = !t.concluida;
        if (t.concluida) mostrarToast('✓ Tarefa concluída!', t.titulo, '');
    }
    renderizar();
}

function deletarTarefa(id) {
    if (!confirm('Deseja excluir esta tarefa?')) return;
    var t = buscarPorId(id);
    tarefas = tarefas.filter(function (x) { return x.id !== id; });
    mostrarToast('Tarefa excluída', t ? t.titulo : '', 'aviso');
    renderizar();
}

function filtrar(tipo, botao) {
    filtroAtivo = tipo;
    var btns = document.querySelectorAll('.filtro-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('ativo');
    botao.classList.add('ativo');
    renderizar();
}


// ============================================================
// AUXILIARES
// ============================================================
function buscarPorId(id) {
    for (var i = 0; i < tarefas.length; i++) {
        if (tarefas[i].id === id) return tarefas[i];
    }
    return null;
}

// "2024-12-31" → "31/12/2024"
function formatarData(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
}

// Retorna o status da data: 'vencida', 'hoje', 'amanha' ou ''
function statusData(iso, concluida) {
    if (!iso || concluida) return '';
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    var amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
    var d = new Date(iso + 'T00:00:00');
    if (d < hoje) return 'vencida';
    if (d.getTime() === hoje.getTime()) return 'hoje';
    if (d.getTime() === amanha.getTime()) return 'amanha';
    return '';
}

// Substitui caracteres especiais para não quebrar o HTML
function escaparHtml(txt) {
    return txt
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function labelPrio(p) {
    return p === 'alta' ? 'Alta' : p === 'media' ? 'Média' : 'Baixa';
}

function iconeData(st) {
    return st === 'vencida' ? '⚠ ' : st === 'hoje' ? '🕐 ' : '📅 ';
}

function sufixoData(st) {
    return st === 'hoje' ? ' — hoje' : st === 'amanha' ? ' — amanhã' : '';
}


// ============================================================
// RENDERIZAR — redesenha toda a lista
// ============================================================
function renderizar() {
    // 1. Filtra quais tarefas mostrar
    var visiveis;
    if (filtroAtivo === 'pendentes') visiveis = tarefas.filter(function (t) { return !t.concluida; });
    else if (filtroAtivo === 'concluidas') visiveis = tarefas.filter(function (t) { return t.concluida; });
    else visiveis = tarefas;

    // 2. Ordena: pendentes primeiro, depois por prioridade (alta > media > baixa)
    var ord = { alta: 0, media: 1, baixa: 2 };
    visiveis = visiveis.slice().sort(function (a, b) {
        if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
        return ord[a.prioridade] - ord[b.prioridade];
    });

    // 3. Gera os cards na lista
    var lista = document.getElementById('lista-tarefas');
    lista.innerHTML = '';

    for (var i = 0; i < visiveis.length; i++) {
        var t = visiveis[i];
        var st = statusData(t.data, t.concluida);

        var dataHtml = t.data
            ? '<span class="tag-data ' + (st || '') + '">' + iconeData(st) + formatarData(t.data) + sufixoData(st) + '</span>'
            : '';

        var descHtml = t.descricao
            ? '<div class="tarefa-desc">' + escaparHtml(t.descricao) + '</div>'
            : '';

        var card = document.createElement('div');
        card.className = 'tarefa-card' + (t.concluida ? ' concluida' : '');
        card.innerHTML =
            '<input type="checkbox" class="tarefa-check"' + (t.concluida ? ' checked' : '') +
            ' onchange="concluirTarefa(' + t.id + ')">' +
            '<div class="tarefa-corpo">' +
            '<div class="tarefa-topo">' +
            '<span class="tarefa-titulo">' + escaparHtml(t.titulo) + '</span>' +
            '<span class="tag-prio prio-' + t.prioridade + '">' + labelPrio(t.prioridade) + '</span>' +
            dataHtml +
            '</div>' +
            descHtml +
            '</div>' +
            '<div class="tarefa-acoes">' +
            '<button class="btn-acao"     title="Editar"  onclick="abrirEdicao(' + t.id + ')">✏️</button>' +
            '<button class="btn-acao del" title="Excluir" onclick="deletarTarefa(' + t.id + ')">🗑️</button>' +
            '</div>';

        lista.appendChild(card);
    }

    // 4. Mostra/esconde mensagem de lista vazia
    document.getElementById('msg-vazio').style.display =
        visiveis.length === 0 ? 'block' : 'none';

    // 5. Atualiza contadores nos botões de filtro
    var pend = tarefas.filter(function (t) { return !t.concluida; }).length;
    var conc = tarefas.filter(function (t) { return t.concluida; }).length;
    document.getElementById('cnt-todas').textContent = tarefas.length;
    document.getElementById('cnt-pendentes').textContent = pend;
    document.getElementById('cnt-concluidas').textContent = conc;
}


// ============================================================
// ATALHOS DE TECLADO
// ============================================================
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') fecharModal();
});

// Enter no campo título adiciona a tarefa
document.getElementById('campo-titulo').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') adicionarTarefa();
});

// Enter no modal salva a edição
document.getElementById('modal-titulo-campo').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') salvarEdicao();
});


// ============================================================
// INICIALIZAÇÃO
// ============================================================
atualizarBotaoNotif();
renderizar();

// Verifica prazos automaticamente a cada 1 hora enquanto a aba estiver aberta
setInterval(function () {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        verificarPrazos();
    }
}, 3600000);