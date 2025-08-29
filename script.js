// =================================================================================
// CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// =================================================================================
const SUPABASE_URL = "https://onworwlttvwhjgohgnqi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ud29yd2x0dHZ3aGpnb2hnbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Nzk0MDksImV4cCI6MjA3MjA1NTQwOX0.rVtUIA_SK7O4cpXKO0mHKwMuhBWJ2qdsA7aLwNdhmtg";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// Aguarda o HTML da página ser completamente carregado para executar o script
document.addEventListener('DOMContentLoaded', function() {

    // --- SELEÇÃO DOS ELEMENTOS DO FORMULÁRIO ---
    const form = document.getElementById('paradaForm');
    const telefoneInput = document.getElementById('telefone');
    const cepInput = document.getElementById('cep');
    const ufInput = document.getElementById('uf');
    const btnLimpar = document.getElementById('limparFormulario');
    const btnGps = document.getElementById('btnLocalizacao');
    
    // --- FUNÇÕES DE MÁSCARA, BUSCA E UPLOAD ---

    function mascaraTelefone(e) {
        let valor = e.target.value.replace(/\D/g, "");
        if (valor.length > 10) {
            e.target.value = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        } else {
            e.target.value = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        }
    }

    async function buscaCep(e) {
        let valor = e.target.value.replace(/\D/g, "");
        e.target.value = valor.replace(/^(\d{5})(\d{0,3}).*/, "$1-$2");

        if (valor.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${valor}/json/`);
                const data = await response.json();

                if (!data.erro) {
                    document.getElementById("logradouro").value = data.logradouro || "";
                    document.getElementById("bairro").value = data.bairro || "";
                    document.getElementById("cidade").value = data.localidade || "";
                    document.getElementById("uf").value = data.uf || "";
                    document.getElementById("numero").focus();
                } else {
                    alert("CEP não encontrado.");
                }
            } catch (err) {
                console.error("Erro ao buscar CEP:", err);
                alert("Não foi possível buscar o CEP. Verifique sua conexão.");
            }
        }
    }

    function mascaraUf(e) {
        e.target.value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    }
    
    async function uploadFotos(files) {
        const urlsDasFotos = [];
        const nomeDoBucket = 'fotos-paradas'; // Certifique-se que o nome do seu bucket é este
        for (const file of files) {
            const nomeDoArquivo = `${Date.now()}-${file.name}`;
            const { error } = await supabaseClient.storage.from(nomeDoBucket).upload(nomeDoArquivo, file);
            if (error) {
                console.error('Erro no upload da foto:', error);
                throw new Error(`Falha no upload do arquivo: ${file.name}`);
            }
            const { data: { publicUrl } } = supabaseClient.storage.from(nomeDoBucket).getPublicUrl(nomeDoArquivo);
            urlsDasFotos.push(publicUrl);
        }
        return urlsDasFotos;
    }

    // --- FUNCIONALIDADES DOS BOTÕES ---

    function limparFormulario() {
        form.reset();
        const msg = document.getElementById("mensagem");
        if (msg) {
            msg.innerHTML = "";
            msg.style.backgroundColor = "transparent";
        }
    }

    function capturarCoordenadas() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (posicao) => {
                    document.getElementById("latitude").value = posicao.coords.latitude.toFixed(6);
                    document.getElementById("longitude").value = posicao.coords.longitude.toFixed(6);
                    alert("Coordenadas GPS capturadas com sucesso!");
                },
                (erro) => {
                    alert("Erro ao capturar localização: " + erro.message);
                }
            );
        } else {
            alert("Geolocalização não é suportada por este navegador.");
        }
    }

    // --- ATIVAÇÃO DOS EVENTOS ---

    telefoneInput.addEventListener('input', mascaraTelefone);
    cepInput.addEventListener('input', buscaCep);
    ufInput.addEventListener('input', mascaraUf);
    btnLimpar.addEventListener('click', limparFormulario);
    btnGps.addEventListener('click', capturarCoordenadas);

    // --- EVENTO DE SUBMIT (SALVAR NO SUPABASE) ---
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const msg = document.getElementById("mensagem");
        const botaoSalvar = e.target.querySelector('button[type="submit"]');

        botaoSalvar.disabled = true;
        botaoSalvar.textContent = 'Salvando...';

        try {
            // Coleta de dados do checklist
            const banheiroStatus = document.querySelector('input[name="banheiros"]:checked')?.value;
            const borrachariaStatus = document.querySelector('input[name="borracharia"]:checked')?.value;
            const outrosItens = Array.from(document.querySelectorAll('.checklist input[type="checkbox"]:checked')).map(cb => cb.value);
            const checklistFinal = [];
            if (banheiroStatus) checklistFinal.push(`Banheiro: ${banheiroStatus}`);
            if (borrachariaStatus) checklistFinal.push(`Borracharia 24h: ${borrachariaStatus}`);
            checklistFinal.push(...outrosItens);

            // Upload das fotos
            const arquivosDeFoto = document.getElementById("fotos").files;
            let urlsSalvas = [];
            if (arquivosDeFoto.length > 0) {
                urlsSalvas = await uploadFotos(arquivosDeFoto);
            }

            // Monta o objeto de dados para salvar
            const dadosParaSalvar = {
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
                fotos_urls: urlsSalvas,
            };
            
            // Envia os dados para o Supabase
            const { error } = await supabaseClient.from("paradas").insert([dadosParaSalvar]);

            if (error) {
                throw error; // Joga o erro para o bloco catch
            }

            msg.innerHTML = "✅ Parada salva com sucesso!";
            msg.style.color = "white";
            msg.style.backgroundColor = "green";
            form.reset();

        } catch (error) {
            msg.innerHTML = `❌ Erro ao salvar: ${error.message}`;
            msg.style.color = "white";
            msg.style.backgroundColor = "red";
        } finally {
            // Reabilita o botão e limpa a mensagem após um tempo
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = 'Salvar Parada';
            setTimeout(() => {
                msg.innerHTML = "";
                msg.style.backgroundColor = "transparent";
            }, 5000);
        }
    });
});