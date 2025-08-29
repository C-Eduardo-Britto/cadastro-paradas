// 🔑 Suas credenciais do Supabase
const SUPABASE_URL = "https://onworwlttvwhjgohgnqi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ud29yd2x0dHZ3aGpnb2hnbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Nzk0MDksImV4cCI6MjA3MjA1NTQwOX0.rVtUIA_SK7O4cpXKO0mHKwMuhBWJ2qdsA7aLwNdhmtg";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SENHA_APAGAR = "apague";

// --- FUNÇÕES DE MÁSCARA E CEP (PARA O MODAL) ---
function mascaraTelefone(e) {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 10) e.target.value = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  else e.target.value = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
}

async function buscaCep(e) {
  let v = e.target.value.replace(/\D/g, "");
  e.target.value = v.replace(/^(\d{5})(\d{0,3}).*/, "$1-$2");
  if (v.length === 8) {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${v}/json/`);
      const data = await response.json();
      if (!data.erro) {
        document.getElementById("edit_logradouro").value = data.logradouro || "";
        document.getElementById("edit_bairro").value = data.bairro || "";
        document.getElementById("edit_cidade").value = data.localidade || "";
        document.getElementById("edit_uf").value = data.uf || "";
        document.getElementById("edit_numero").focus();
      } else { alert("CEP não encontrado."); }
    } catch (err) { console.error("Erro ao buscar CEP:", err); alert("Não foi possível buscar o CEP."); }
  }
}

function mascaraUf(e) {
    e.target.value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
}

function aplicarMascarasNoModal() {
    document.getElementById('edit_telefone').addEventListener('input', mascaraTelefone);
    document.getElementById('edit_cep').addEventListener('input', buscaCep);
    document.getElementById('edit_uf').addEventListener('input', mascaraUf);
}

// --- FUNÇÕES DO MODAL ---
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const modalCloseButton = document.querySelector('.modal-close');

function fecharModal() {
    modal.style.display = 'none';
    editForm.innerHTML = '';
}

modalCloseButton.addEventListener('click', fecharModal);
window.addEventListener('click', function(event) {
    if (event.target == modal) {
        fecharModal();
    }
});


// --- LÓGICA PRINCIPAL ---
async function carregarParadas() {
    const container = document.getElementById('lista-paradas');
    container.innerHTML = '<p>Carregando registros...</p>';

    const { data, error } = await supabaseClient
        .from('paradas').select('*').order('criado_em', { ascending: false });

    if (error) {
        container.innerHTML = `<p style="color: red;">Erro ao carregar os registros: ${error.message}</p>`;
        console.error(error);
        return;
    }
    if (data.length === 0) {
        container.innerHTML = '<p>Nenhuma parada cadastrada ainda.</p>';
        return;
    }

    container.innerHTML = '';
    data.forEach(parada => {
        const div = document.createElement('div');
        div.className = 'registro';
        div.innerHTML = `
            <h3>${parada.nome}</h3>
            <p><strong>Contato:</strong> ${parada.nome_contato || 'N/A'} - ${parada.telefone || 'N/A'}</p>
            <p><strong>Endereço:</strong> ${parada.logradouro || ''}, ${parada.numero || ''} - ${parada.cidade || ''}/${parada.uf || ''}</p>
            <p><strong>Checklist:</strong> ${parada.checklist.join(', ') || 'N/A'}</p>
            <div class="botoes-registro">
                <button class="btn-editar" data-id="${parada.id}">Editar</button>
                <button class="btn-apagar" data-id="${parada.id}">Apagar</button>
            </div>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.btn-editar').forEach(button => {
        button.addEventListener('click', () => abrirModalEdicao(button.dataset.id));
    });
    document.querySelectorAll('.btn-apagar').forEach(button => {
        button.addEventListener('click', () => apagarParada(button.dataset.id));
    });
}

async function abrirModalEdicao(id) {
    const { data, error } = await supabaseClient.from('paradas').select('*').eq('id', id).single();
    if (error || !data) {
        alert("Não foi possível carregar os dados para edição.");
        console.error(error);
        return;
    }

    editForm.innerHTML = `
        <input type="hidden" id="editId" value="${data.id}">
        
        <div class="section-title">Localização GPS</div>
        <button type="button" id="edit_btnLocalizacao">Atualizar Coordenadas GPS</button>
        <div class="form-row">
             <div class="form-group">
                <label for="edit_latitude">Latitude:</label>
                <input type="text" id="edit_latitude" name="latitude" value="${data.latitude || ''}" readonly>
            </div>
            <div class="form-group">
                <label for="edit_longitude">Longitude:</label>
                <input type="text" id="edit_longitude" name="longitude" value="${data.longitude || ''}" readonly>
            </div>
        </div>

        <div class="form-group"><label for="edit_nome">Nome do Posto / Ponto de Parada:</label><input type="text" id="edit_nome" value="${data.nome || ''}"></div>
        <div class="form-group"><label for="edit_nome_contato">Nome de Contato:</label><input type="text" id="edit_nome_contato" value="${data.nome_contato || ''}"></div>
        <div class="form-group"><label for="edit_telefone">Telefone:</label><input type="tel" id="edit_telefone" value="${data.telefone || ''}"></div>
        <div class="section-title">Endereço</div>
        <div class="form-group"><label for="edit_cep">CEP:</label><input type="text" id="edit_cep" value="${data.cep || ''}"></div>
        <div class="form-group"><label for="edit_logradouro">Logradouro:</label><input type="text" id="edit_logradouro" value="${data.logradouro || ''}"></div>
        <div class="form-row"><div class="form-group"><label for="edit_numero">Número:</label><input type="text" id="edit_numero" value="${data.numero || ''}"></div><div class="form-group"><label for="edit_bairro">Bairro:</label><input type="text" id="edit_bairro" value="${data.bairro || ''}"></div></div>
        <div class="form-row"><div class="form-group"><label for="edit_cidade">Cidade:</label><input type="text" id="edit_cidade" value="${data.cidade || ''}"></div><div class="form-group"><label for="edit_uf">UF:</label><input type="text" id="edit_uf" value="${data.uf || ''}" maxlength="2"></div></div>
        <div class="section-title">Estrutura do Local</div><div class="checklist" id="edit_checklist"></div>
        <div class="section-title">Fotos Salvas</div><div id="fotos-container"></div>
        <div class="section-title">Observações</div><div class="form-group"><textarea id="edit_observacoes" rows="3">${data.observacoes || ''}</textarea></div>
        <button type="submit">Salvar Alterações</button>
    `;

    const checklistContainer = document.getElementById('edit_checklist');
    checklistContainer.innerHTML = `
        <div class="checklist-item-radio"><span>Banheiros:</span><div class="radio-options"><label><input type="radio" name="edit_banheiros" value="Gratuito" ${data.checklist.includes('Banheiro: Gratuito') ? 'checked' : ''}> Gratuito</label><label><input type="radio" name="edit_banheiros" value="Pago" ${data.checklist.includes('Banheiro: Pago') ? 'checked' : ''}> Pago</label></div></div>
        <div class="checklist-item-radio"><span>Borracharia 24h:</span><div class="radio-options"><label><input type="radio" name="edit_borracharia" value="Sim" ${data.checklist.includes('Borracharia 24h: Sim') ? 'checked' : ''}> Sim</label><label><input type="radio" name="edit_borracharia" value="Não" ${data.checklist.includes('Borracharia 24h: Não') ? 'checked' : ''}> Não</label><label><input type="radio" name="edit_borracharia" value="Nenhuma" ${data.checklist.includes('Borracharia 24h: Nenhuma') ? 'checked' : ''}> Sem borracharia</label></div></div>
        <label><input type="checkbox" value="Restaurante" ${data.checklist.includes('Restaurante') ? 'checked' : ''}> Restaurante</label>
        <label><input type="checkbox" value="Oficina" ${data.checklist.includes('Oficina') ? 'checked' : ''}> Oficina</label><label><input type="checkbox" value="Conveniência" ${data.checklist.includes('Conveniência') ? 'checked' : ''}> Conveniência</label>
        <label><input type="checkbox" value="Estacionamento segregado" ${data.checklist.includes('Estacionamento segregado') ? 'checked' : ''}> Estacionamento segregado</label>
        <label><input type="checkbox" value="Câmeras de segurança" ${data.checklist.includes('Câmeras de segurança') ? 'checked' : ''}> Câmeras de segurança</label>
        <label><input type="checkbox" value="Pousada" ${data.checklist.includes('Pousada') ? 'checked' : ''}> Pousada</label>
    `;
    
    const fotosContainer = document.getElementById('fotos-container');
    if (data.fotos_urls && data.fotos_urls.length > 0) {
        data.fotos_urls.forEach(url => { fotosContainer.innerHTML += `<img src="${url}" alt="Foto da parada">`; });
    } else {
        fotosContainer.innerHTML = '<p>Nenhuma foto cadastrada.</p>';
    }

    document.getElementById('edit_btnLocalizacao').addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => {
                    document.getElementById("edit_latitude").value = pos.coords.latitude.toFixed(6);
                    document.getElementById("edit_longitude").value = pos.coords.longitude.toFixed(6);
                    alert("Coordenadas GPS atualizadas!");
                },
                err => alert("Erro ao capturar localização: " + err.message)
            );
        } else {
            alert("Geolocalização não é suportada neste navegador.");
        }
    });

    aplicarMascarasNoModal();

    editForm.onsubmit = async (e) => {
        e.preventDefault();
        await salvarEdicao(data.id);
    };

    modal.style.display = 'flex';
}

async function salvarEdicao(id) {
    const banheiroStatus = document.querySelector('input[name="edit_banheiros"]:checked')?.value;
    const borrachariaStatus = document.querySelector('input[name="edit_borracharia"]:checked')?.value;
    const outrosItens = Array.from(document.querySelectorAll('#edit_checklist input[type="checkbox"]:checked')).map(cb => cb.value);
    const checklistFinal = [];
    if (banheiroStatus) checklistFinal.push(`Banheiro: ${banheiroStatus}`);
    if (borrachariaStatus) checklistFinal.push(`Borracharia 24h: ${borrachariaStatus}`);
    checklistFinal.push(...outrosItens);

    const dadosAtualizados = {
        latitude: document.getElementById('edit_latitude').value || null,
        longitude: document.getElementById('edit_longitude').value || null,
        nome: document.getElementById('edit_nome').value,
        nome_contato: document.getElementById('edit_nome_contato').value,
        telefone: document.getElementById('edit_telefone').value,
        cep: document.getElementById('edit_cep').value,
        logradouro: document.getElementById('edit_logradouro').value,
        numero: document.getElementById('edit_numero').value,
        bairro: document.getElementById('edit_bairro').value,
        cidade: document.getElementById('edit_cidade').value,
        uf: document.getElementById('edit_uf').value,
        observacoes: document.getElementById('edit_observacoes').value,
        checklist: checklistFinal,
    };

    const { error } = await supabaseClient.from('paradas').update(dadosAtualizados).eq('id', id);
    if (error) {
        alert("Erro ao salvar as alterações.");
        console.error(error);
    } else {
        alert("Parada atualizada com sucesso!");
        fecharModal();
        carregarParadas();
    }
}

async function apagarParada(id) {
    const senha = prompt("Para apagar, digite a senha de segurança:");
    if (senha === null) return;

    if (senha === SENHA_APAGAR) {
        if (confirm("Você tem certeza que deseja apagar este registro? Esta ação não pode ser desfeita.")) {
            const { error } = await supabaseClient
                .from('paradas')
                .delete()
                .eq('id', id);

            if (error) {
                alert("Erro ao apagar o registro.");
                console.error(error);
            } else {
                alert("Registro apagado com sucesso!");
                carregarParadas();
            }
        }
    } else {
        alert("Senha incorreta. A operação foi cancelada.");
    }
}

document.addEventListener('DOMContentLoaded', carregarParadas);