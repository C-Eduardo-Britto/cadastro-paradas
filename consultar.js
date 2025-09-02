// 🔑 Suas credenciais do Supabase
const SUPABASE_URL = "https://onworwlttvwhjgohgnqi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ud29yd2x0dHZ3aGpnb2hnbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Nzk0MDksImV4cCI6MjA3MjA1NTQwOX0.rVtUIA_SK7O4cpXKO0mHKwMuhBWJ2qdsA7aLwNdhmtg";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SENHA_APAGAR = "apague";

// Array global para gerenciar fotos a serem apagadas na edição
let fotosParaApagar = [];

// --- FUNÇÕES REUTILIZÁVEIS ---
function formatarData(dataIso) {
    if (!dataIso) return { relativo: '', absoluto: '' };
    const data = new Date(dataIso);
    const agora = new Date();
    const optionsAbsoluto = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' };
    const dataAbsoluta = new Intl.DateTimeFormat('pt-BR', optionsAbsoluto).format(data);
    const tooltipAbsoluto = `Cadastrado em: ${dataAbsoluta}`;
    const segundos = Math.round((agora - data) / 1000);
    const minutos = Math.round(segundos / 60);
    const horas = Math.round(minutos / 60);
    const dias = Math.round(horas / 24);
    if (segundos < 60) { return { relativo: 'cadastrado agora mesmo', absoluto: tooltipAbsoluto }; }
    else if (minutos < 60) { return { relativo: `cadastrado há ${minutos} min`, absoluto: tooltipAbsoluto }; }
    else if (horas < 24) { return { relativo: `cadastrado há ${horas}h`, absoluto: tooltipAbsoluto }; }
    else if (dias === 1) { return { relativo: 'cadastrado ontem', absoluto: tooltipAbsoluto }; }
    else if (dias < 7) { return { relativo: `cadastrado há ${dias} dias`, absoluto: tooltipAbsoluto }; }
    else { const optionsResumido = { year: '2-digit', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo' }; return { relativo: `cadastrado em ${new Intl.DateTimeFormat('pt-BR', optionsResumido).format(data)}`, absoluto: tooltipAbsoluto }; }
}
async function uploadFotos(files) { const urlsDasFotos = []; const nomeDoBucket = 'fotos-paradas'; for (const file of Array.from(files)) { const nomeDoArquivo = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; const { error } = await supabaseClient.storage.from(nomeDoBucket).upload(nomeDoArquivo, file); if (error) { console.error('Erro no upload da foto:', error); throw new Error(`Falha no upload do arquivo: ${file.name}`); } const { data: { publicUrl } } = supabaseClient.storage.from(nomeDoBucket).getPublicUrl(nomeDoArquivo); urlsDasFotos.push(publicUrl); } return urlsDasFotos; }
function mascaraTelefone(e) { let v = e.target.value.replace(/\D/g, ""); if (v.length > 10) e.target.value = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3"); else e.target.value = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3"); }
async function buscaCep(e) { let v = e.target.value.replace(/\D/g, ""); e.target.value = v.replace(/^(\d{5})(\d{0,3}).*/, "$1-$2"); if (v.length === 8) { try { const response = await fetch(`https://viacep.com.br/ws/${v}/json/`); const data = await response.json(); if (!data.erro) { document.getElementById("edit_logradouro").value = data.logradouro || ""; document.getElementById("edit_bairro").value = data.bairro || ""; document.getElementById("edit_cidade").value = data.localidade || ""; document.getElementById("edit_uf").value = data.uf || ""; document.getElementById("edit_numero").focus(); } else { alert("CEP não encontrado."); } } catch (err) { console.error("Erro ao buscar CEP:", err); alert("Não foi possível buscar o CEP."); } } }
function mascaraUf(e) { e.target.value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase(); }
function aplicarMascarasNoModal() { document.getElementById('edit_telefone').addEventListener('input', mascaraTelefone); document.getElementById('edit_cep').addEventListener('input', buscaCep); document.getElementById('edit_uf').addEventListener('input', mascaraUf); }

// --- FUNÇÕES DO MODAL ---
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const modalCloseButton = document.querySelector('.modal-close');
function fecharModal() { modal.style.display = 'none'; editForm.innerHTML = ''; fotosParaApagar = []; }
modalCloseButton.addEventListener('click', fecharModal);
window.addEventListener('click', function(event) { if (event.target == modal) { fecharModal(); } });

// --- LÓGICA PRINCIPAL DA PÁGINA DE CONSULTA ---
document.addEventListener('DOMContentLoaded', function() {
    
    async function carregarParadas() {
        const container = document.getElementById('lista-paradas');
        container.innerHTML = '<p>Carregando registros...</p>';
        const { data, error } = await supabaseClient.from('paradas').select('*').order('criado_em', { ascending: false });
        if (error) { container.innerHTML = `<p style="color: red;">Erro ao carregar os registros: ${error.message}</p>`; return; }
        if (!data || data.length === 0) { container.innerHTML = '<p>Nenhuma parada cadastrada ainda.</p>'; return; }
        container.innerHTML = '';
        data.forEach(parada => {
            const div = document.createElement('div');
            div.className = 'registro';
            const dataFormatada = formatarData(parada.criado_em);
            const checklistTexto = (parada.checklist || []).join(', ') || 'N/A';
            let botaoLocalizacaoHtml = '';
            const temGps = parada.latitude && parada.longitude;
            const temEndereco = parada.logradouro && parada.cidade;
            if (temGps || temEndereco) {
                botaoLocalizacaoHtml = `<button class="btn-localizacao" data-id="${parada.id}">Localização</button>`;
            } else {
                botaoLocalizacaoHtml = `<button class="btn-localizacao" disabled title="Sem GPS ou endereço cadastrado">Localização</button>`;
            }
            div.innerHTML = `<p class="data-criacao" title="${dataFormatada.absoluto}">${dataFormatada.relativo}</p><h3>${parada.nome || 'Nome não informado'}</h3><p><strong>Contato:</strong> ${parada.nome_contato || 'N/A'} - ${parada.telefone || 'N/A'}</p><p><strong>Endereço:</strong> ${parada.logradouro || ''}, ${parada.numero || ''} - ${parada.cidade || ''}/${parada.uf || ''}</p><p><strong>Checklist:</strong> ${checklistTexto}</p><div class="botoes-registro">${botaoLocalizacaoHtml}<button class="btn-editar" data-id="${parada.id}">Editar</button><button class="btn-apagar" data-id="${parada.id}">Apagar</button></div>`;
            container.appendChild(div);
        });
        document.querySelectorAll('.btn-localizacao:not([disabled])').forEach(b => { b.addEventListener('click', () => window.open(`mapa.html?id=${b.dataset.id}`, '_blank')); });
        document.querySelectorAll('.btn-editar').forEach(b => { b.addEventListener('click', () => abrirModalEdicao(b.dataset.id)); });
        document.querySelectorAll('.btn-apagar').forEach(b => { b.addEventListener('click', () => apagarParada(b.dataset.id)); });
    }

    async function abrirModalEdicao(id) {
        const { data, error } = await supabaseClient.from('paradas').select('*').eq('id', id).single();
        if (error || !data) { alert("Não foi possível carregar os dados para edição."); return; }
        
        const temDadosGps = (data.latitude && data.latitude.toString().trim() !== '') || (data.longitude && data.longitude.toString().trim() !== '');

        editForm.innerHTML = `
            <input type="hidden" id="editId" value="${data.id}">
            <div class="section-title">Localização GPS</div>
            <div class="action-buttons">
                <button type="button" id="edit_btnLocalizacao" ${temDadosGps ? 'disabled title="Zere as coordenadas para capturar novamente"' : ''}>Capturar Coordenadas GPS</button>
                <button type="button" id="edit_btnZerarGps" ${!temDadosGps ? 'disabled title="Não há coordenadas para zerar"' : ''}>Zerar GPS</button>
            </div>
            <div class="form-row">
                 <div class="form-group"><label for="edit_latitude">Latitude:</label><input type="text" id="edit_latitude" value="${data.latitude || ''}"></div>
                 <div class="form-group"><label for="edit_longitude">Longitude:</label><input type="text" id="edit_longitude" value="${data.longitude || ''}"></div>
            </div>
            <div class="form-group"><label for="edit_nome">Nome do Posto / Ponto de Parada:</label><input type="text" id="edit_nome" value="${data.nome || ''}"></div>
            <div class="form-group"><label for="edit_nome_contato">Nome de Contato:</label><input type="text" id="edit_nome_contato" value="${data.nome_contato || ''}"></div>
            <div class="form-group"><label for="edit_telefone">Telefone:</label><input type="tel" id="edit_telefone" value="${data.telefone || ''}"></div>
            <div class="section-title">Endereço</div><div class="form-group"><label for="edit_cep">CEP:</label><input type="text" id="edit_cep" value="${data.cep || ''}"></div>
            <div class="form-group"><label for="edit_logradouro">Logradouro:</label><input type="text" id="edit_logradouro" value="${data.logradouro || ''}"></div>
            <div class="form-row"><div class="form-group"><label for="edit_numero">Número:</label><input type="text" id="edit_numero" value="${data.numero || ''}"></div><div class="form-group"><label for="edit_bairro">Bairro:</label><input type="text" id="edit_bairro" value="${data.bairro || ''}"></div></div>
            <div class="form-row"><div class="form-group"><label for="edit_cidade">Cidade:</label><input type="text" id="edit_cidade" value="${data.cidade || ''}"></div><div class="form-group"><label for="edit_uf">UF:</label><input type="text" id="edit_uf" value="${data.uf || ''}" maxlength="2"></div></div>
            <div class="section-title">Estrutura do Local</div><div class="checklist" id="edit_checklist"></div>
            <div class="fotos-gerenciador"><div class="section-title">Fotos Salvas</div><div id="fotos-container"></div><div class="section-title">Adicionar Novas Fotos</div><input type="file" id="edit_fotos" multiple accept="image/*"></div>
            <div class="section-title">Observações</div><div class="form-group"><textarea id="edit_observacoes" rows="3">${data.observacoes || ''}</textarea></div>
            <button type="submit">Salvar Alterações</button>
        `;
        
        const checklistItems = data.checklist || [];
        const checklistContainer = document.getElementById('edit_checklist');
        checklistContainer.innerHTML = `<div class="checklist-item-radio"><span>Banheiros:</span><div class="radio-options"><label><input type="radio" name="edit_banheiros" value="Gratuito" ${checklistItems.includes('Banheiro: Gratuito')?'checked':''}> Gratuito</label><label><input type="radio" name="edit_banheiros" value="Pago" ${checklistItems.includes('Banheiro: Pago')?'checked':''}> Pago</label></div></div><div class="checklist-item-radio"><span>Borracharia 24h:</span><div class="radio-options"><label><input type="radio" name="edit_borracharia" value="Sim" ${checklistItems.includes('Borracharia 24h: Sim')?'checked':''}> Sim</label><label><input type="radio" name="edit_borracharia" value="Não" ${checklistItems.includes('Borracharia 24h: Não')?'checked':''}> Não</label><label><input type="radio" name="edit_borracharia" value="Nenhuma" ${checklistItems.includes('Borracharia 24h: Nenhuma')?'checked':''}> Sem borracharia</label></div></div><label><input type="checkbox" value="Restaurante" ${checklistItems.includes('Restaurante')?'checked':''}> Restaurante</label><label><input type="checkbox" value="Oficina" ${checklistItems.includes('Oficina')?'checked':''}> Oficina</label><label><input type="checkbox" value="Conveniência" ${checklistItems.includes('Conveniência')?'checked':''}> Conveniência</label><label><input type="checkbox" value="Estacionamento segregado" ${checklistItems.includes('Estacionamento segregado')?'checked':''}> Estacionamento segregado</label><label><input type="checkbox" value="Câmeras de segurança" ${checklistItems.includes('Câmeras de segurança')?'checked':''}> Câmeras de segurança</label><label><input type="checkbox" value="Pousada" ${checklistItems.includes('Pousada')?'checked':''}> Pousada</label>`;
        
        const fotosContainer = document.getElementById('fotos-container');
        if(data.fotos_urls && data.fotos_urls.length > 0){data.fotos_urls.forEach(url=>{const fotoDiv=document.createElement('div');fotoDiv.className='foto-miniatura';fotoDiv.innerHTML=`<img src="${url}" alt="Foto da parada"><button type="button" class="btn-apagar-foto" data-url="${url}">&times;</button>`;fotosContainer.appendChild(fotoDiv)});fotosContainer.querySelectorAll('.btn-apagar-foto').forEach(btn=>{btn.onclick=function(){if(!fotosParaApagar.includes(this.dataset.url)){fotosParaApagar.push(this.dataset.url)}this.parentElement.style.opacity='0.4';this.remove()}})}else{fotosContainer.innerHTML='<p>Nenhuma foto cadastrada.</p>'}
        
        const btnCapturar = document.getElementById('edit_btnLocalizacao');
        const btnZerar = document.getElementById('edit_btnZerarGps');

        btnCapturar.addEventListener('click', () => { 
            if(navigator.geolocation){
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        document.getElementById("edit_latitude").value = pos.coords.latitude.toFixed(6);
                        document.getElementById("edit_longitude").value = pos.coords.longitude.toFixed(6);
                        btnZerar.disabled = false;
                        btnCapturar.disabled = true;
                        alert("Coordenadas GPS atualizadas!");
                    },
                    err => alert("Erro: " + err.message)
                );
            }
        });
        
        btnZerar.addEventListener('click', function() { 
            document.getElementById("edit_latitude").value = ""; 
            document.getElementById("edit_longitude").value = ""; 
            alert("Campos de GPS zerados. Salve as alterações para confirmar."); 
            this.disabled = true;
            btnCapturar.disabled = false;
        });

        aplicarMascarasNoModal();
        editForm.onsubmit = async (e) => { e.preventDefault(); await salvarEdicao(id, data.fotos_urls); };
        modal.style.display = 'flex';
    }

    async function salvarEdicao(id, urlsAtuais) {
        const banheiroStatus = document.querySelector('input[name="edit_banheiros"]:checked')?.value;
        const borrachariaStatus = document.querySelector('input[name="edit_borracharia"]:checked')?.value;
        const outrosItens = Array.from(document.querySelectorAll('#edit_checklist input[type="checkbox"]:checked')).map(cb => cb.value);
        const checklistFinal = [];
        if (banheiroStatus) checklistFinal.push(`Banheiro: ${banheiroStatus}`);
        if (borrachariaStatus) checklistFinal.push(`Borracharia 24h: ${borrachariaStatus}`);
        checklistFinal.push(...outrosItens);
        const dadosAtualizados = { latitude: document.getElementById('edit_latitude').value || null, longitude: document.getElementById('edit_longitude').value || null, nome: document.getElementById('edit_nome').value, nome_contato: document.getElementById('edit_nome_contato').value, telefone: document.getElementById('edit_telefone').value, cep: document.getElementById('edit_cep').value, logradouro: document.getElementById('edit_logradouro').value, numero: document.getElementById('edit_numero').value, bairro: document.getElementById('edit_bairro').value, cidade: document.getElementById('edit_cidade').value, uf: document.getElementById('edit_uf').value, observacoes: document.getElementById('edit_observacoes').value, checklist: checklistFinal };
        try {
            if (fotosParaApagar.length > 0) { const nomesDosArquivos = fotosParaApagar.map(url => url.split('/').pop()); await supabaseClient.storage.from('fotos-paradas').remove(nomesDosArquivos); }
            const novosArquivos = document.getElementById('edit_fotos').files;
            let novasUrls = [];
            if (novosArquivos.length > 0) { novasUrls = await uploadFotos(novosArquivos); }
            const urlsFinais = (urlsAtuais || []).filter(url => !fotosParaApagar.includes(url)).concat(novasUrls);
            dadosAtualizados.fotos_urls = urlsFinais;
            const { error } = await supabaseClient.from('paradas').update(dadosAtualizados).eq('id', id);
            if (error) throw error;
            alert("Parada atualizada com sucesso!");
            fecharModal();
            carregarParadas();
        } catch(error) {
            alert(`Erro ao atualizar: ${error.message}`);
            console.error(error);
        }
    }

    async function apagarParada(id) {
        const senha = prompt("Para apagar, digite a senha de segurança:");
        if (senha === null) return;
        if (senha === SENHA_APAGAR) {
            if (confirm("Você tem certeza? Esta ação não pode ser desfeita.")) {
                const { error } = await supabaseClient.from('paradas').delete().eq('id', id);
                if (error) { alert("Erro ao apagar."); console.error(error); }
                else { alert("Registro apagado."); carregarParadas(); }
            }
        } else {
            alert("Senha incorreta.");
        }
    }
    
    carregarParadas();
});