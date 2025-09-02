// =================================================================================
// CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// =================================================================================
const SUPABASE_URL = "https://onworwlttvwhjgohgnqi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ud29yd2x0dHZ3aGpnb2hnbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Nzk0MDksImV4cCI6MjA3MjA1NTQwOX0.rVtUIA_SK7O4cpXKO0mHKwMuhBWJ2qdsA7aLwNdhmtg";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SENHA_APAGAR = "apague";

let fotosParaApagar = [];

// =================================================================================
// FUNÇÕES REUTILIZÁVEIS
// =================================================================================
function mascaraTelefone(e) { let v = e.target.value.replace(/\D/g, ""); if (v.length > 10) e.target.value = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3"); else e.target.value = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3"); }
async function buscaCep(e, idPrefix = "") { let v = e.target.value.replace(/\D/g, ""); e.target.value = v.replace(/^(\d{5})(\d{0,3}).*/, "$1-$2"); if (v.length === 8) { try { const response = await fetch(`https://viacep.com.br/ws/${v}/json/`); const data = await response.json(); if (!data.erro) { document.getElementById(`${idPrefix}logradouro`).value = data.logradouro || ""; document.getElementById(`${idPrefix}bairro`).value = data.bairro || ""; document.getElementById(`${idPrefix}cidade`).value = data.localidade || ""; document.getElementById(`${idPrefix}uf`).value = data.uf || ""; document.getElementById(`${idPrefix}numero`).focus(); } else { alert("CEP não encontrado."); } } catch (err) { console.error("Erro ao buscar CEP:", err); alert("Não foi possível buscar o CEP."); } } }
function mascaraUf(e) { e.target.value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase(); }
async function uploadFotos(files) { const urlsDasFotos = []; const nomeDoBucket = 'fotos-paradas'; for (const file of Array.from(files)) { const nomeDoArquivo = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; const { error } = await supabaseClient.storage.from(nomeDoBucket).upload(nomeDoArquivo, file); if (error) { console.error('Erro no upload da foto:', error); throw new Error(`Falha no upload do arquivo: ${file.name}`); } const { data: { publicUrl } } = supabaseClient.storage.from(nomeDoBucket).getPublicUrl(nomeDoArquivo); urlsDasFotos.push(publicUrl); } return urlsDasFotos; }

// =================================================================================
// LÓGICA PRINCIPAL - EXECUTADA QUANDO A PÁGINA TERMINA DE CARREGAR
// =================================================================================
document.addEventListener('DOMContentLoaded', function() {

    // --- CÓDIGO PARA A PÁGINA DE CADASTRO/EDIÇÃO (index.html) ---
    const paradaForm = document.getElementById('paradaForm');
    if (paradaForm) {
        
        document.getElementById('telefone').addEventListener('input', mascaraTelefone);
        document.getElementById('cep').addEventListener('input', (e) => buscaCep(e, ''));
        document.getElementById('uf').addEventListener('input', mascaraUf);
        
        document.getElementById('btnLocalizacao').addEventListener('click', function() { if (navigator.geolocation) { navigator.geolocation.getCurrentPosition( pos => { document.getElementById("latitude").value = pos.coords.latitude.toFixed(6); document.getElementById("longitude").value = pos.coords.longitude.toFixed(6); alert("Coordenadas GPS capturadas com sucesso!"); }, err => alert("Erro ao capturar localização: " + err.message) ); } else { alert("Geolocalização não é suportada."); } });
        
        document.getElementById('limparFormulario').addEventListener('click', function() { if (new URLSearchParams(window.location.search).has('id')) { window.location.href = 'index.html'; } else { paradaForm.reset(); const msg = document.getElementById("mensagem"); msg.innerHTML = ""; msg.style.backgroundColor = "transparent"; } });

        paradaForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const urlParams = new URLSearchParams(window.location.search);
            const idParaEditar = urlParams.get('id');
            const msg = document.getElementById("mensagem");
            const botaoSalvar = e.target.querySelector('button[type="submit"]');
            botaoSalvar.disabled = true;
            botaoSalvar.textContent = idParaEditar ? 'Atualizando...' : 'Salvando...';

            try {
                const banheiroStatus = document.querySelector('input[name="banheiros"]:checked')?.value;
                const borrachariaStatus = document.querySelector('input[name="borracharia"]:checked')?.value;
                const outrosItens = Array.from(document.querySelectorAll('.checklist input[type="checkbox"]:checked')).map(cb => cb.value);
                const checklistFinal = [];
                if (banheiroStatus) checklistFinal.push(`Banheiro: ${banheiroStatus}`);
                if (borrachariaStatus) checklistFinal.push(`Borracharia 24h: ${borrachariaStatus}`);
                checklistFinal.push(...outrosItens);

                const arquivosDeFoto = document.getElementById("fotos").files;
                let urlsSalvas = [];
                if (arquivosDeFoto.length > 0) { urlsSalvas = await uploadFotos(arquivosDeFoto); }

                const dadosFormulario = {
                    nome: document.getElementById("nome").value,
                    nome_contato: document.getElementById("nome_contato").value,
                    telefone: document.getElementById("telefone").value,
                    cep: document.getElementById("cep").value,
                    logradouro: document.getElementById("logradouro").value,
                    numero: document.getElementById("numero").value,
                    bairro: document.getElementById("bairro").value,
                    cidade: document.getElementById("cidade").value,
                    uf: document.getElementById("uf").value,
                    latitude: document.getElementById("latitude").value || null,
                    longitude: document.getElementById("longitude").value || null,
                    checklist: checklistFinal,
                    observacoes: document.getElementById("observacoes").value,
                    fotos_urls: urlsSalvas.length > 0 ? urlsSalvas : undefined,
                };
                
                // Converte campos de texto para maiúsculas antes de salvar
                const camposParaConverter = ['nome', 'nome_contato', 'logradouro', 'bairro', 'cidade', 'observacoes'];
                camposParaConverter.forEach(campo => {
                    if (dadosFormulario[campo]) {
                        dadosFormulario[campo] = dadosFormulario[campo].toUpperCase();
                    }
                });
                
                let error;
                if (idParaEditar) {
                    const { error: updateError } = await supabaseClient.from('paradas').update(dadosFormulario).eq('id', idParaEditar);
                    error = updateError;
                } else {
                    const { error: insertError } = await supabaseClient.from('paradas').insert([dadosFormulario]);
                    error = insertError;
                }
                if (error) throw error;
                msg.innerHTML = "✅ Parada salva com sucesso!";
                msg.style.color = "white"; msg.style.backgroundColor = "green";
                if (idParaEditar) {
                    setTimeout(() => { window.location.href = 'consultar.html'; }, 1500);
                } else {
                    paradaForm.reset();
                }

            } catch (error) {
                msg.innerHTML = `❌ Erro ao salvar: ${error.message}`;
                msg.style.color = "white"; msg.style.backgroundColor = "red";
            } finally {
                botaoSalvar.disabled = false;
                botaoSalvar.textContent = idParaEditar ? 'Atualizar Parada' : 'Salvar Parada';
                setTimeout(() => { msg.innerHTML = ""; msg.style.backgroundColor = "transparent"; }, 5000);
            }
        });

        async function carregarDadosParaEdicao() {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            if (id) {
                document.querySelector('h2').textContent = "Editar Parada";
                document.querySelector('button[type="submit"]').textContent = "Atualizar Parada";
                const { data, error } = await supabaseClient.from('paradas').select('*').eq('id', id).single();
                if (error || !data) { alert("Erro ao carregar dados para edição."); window.location.href = 'index.html'; return; }
                
                Object.keys(data).forEach(key => {
                    const el = document.getElementById(key);
                    if (el && typeof data[key] === 'string') { el.value = data[key]; }
                });
                
                if (data.checklist) {
                    data.checklist.forEach(item => {
                        const [chave, valor] = item.split(': ');
                        if (valor) {
                            const inputRadio = document.querySelector(`input[name="${chave.toLowerCase().replace(' 24h','')}"][value="${valor}"]`);
                            if (inputRadio) inputRadio.checked = true;
                        } else {
                            const inputCheckbox = document.querySelector(`input[type="checkbox"][value="${item}"]`);
                            if (inputCheckbox) inputCheckbox.checked = true;
                        }
                    });
                }
            }
        }
        carregarDadosParaEdicao();
    }

    // --- CÓDIGO PARA A PÁGINA DE CONSULTA (consultar.html) ---
    const listaParadas = document.getElementById('lista-paradas');
    if (listaParadas) {
        const modal = document.getElementById('editModal');
        const editForm = document.getElementById('editForm');
        
        function fecharModal() { modal.style.display = 'none'; editForm.innerHTML = ''; fotosParaApagar = []; }
        document.querySelector('.modal-close').addEventListener('click', fecharModal);
        window.addEventListener('click', (event) => { if (event.target == modal) fecharModal(); });
        
        async function carregarParadas() { /* ... código para carregar paradas ... */ }
        
        async function abrirModalEdicao(id) {
            // ... (lógica completa de abrir modal, incluindo máscaras)
        }

        async function salvarEdicao(id, urlsAtuais) {
            // ... (lógica do checklist)
            const checklistFinal = [];
            
            const dadosAtualizados = {
                nome: document.getElementById('edit_nome').value,
                nome_contato: document.getElementById('edit_nome_contato').value,
                // ... (outros campos)
                observacoes: document.getElementById('edit_observacoes').value,
                checklist: checklistFinal,
            };
            
            // Converte campos de texto para maiúsculas antes de atualizar
            const camposParaConverter = ['nome', 'nome_contato', 'logradouro', 'bairro', 'cidade', 'observacoes'];
            camposParaConverter.forEach(campo => {
                if (dadosAtualizados[campo]) {
                    dadosAtualizados[campo] = dadosAtualizados[campo].toUpperCase();
                }
            });

            try {
                // ... (lógica de fotos e update no supabase)
            } catch(error) {
                // ... (tratamento de erro)
            }
        }

        async function apagarParada(id) { /* ... código para apagar ... */ }

        carregarParadas();
    }
});