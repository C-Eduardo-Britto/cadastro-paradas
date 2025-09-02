// Suas credenciais do Supabase
const SUPABASE_URL = "https://onworwlttvwhjgohgnqi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ud29yd2x0dHZ3aGpnb2hnbnFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Nzk0MDksImV4cCI6MjA3MjA1NTQwOX0.rVtUIA_SK7O4cpXKO0mHKwMuhBWJ2qdsA7aLwNdhmtg";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função principal que é chamada pelo script do Google Maps no HTML
async function initMap() {
    // 1. Pega o ID da URL, se houver um
    const urlParams = new URLSearchParams(window.location.search);
    const paradaIdFoco = urlParams.get('id');

    // 2. Busca todas as paradas no Supabase
    const { data: paradas, error } = await supabaseClient
        .from('paradas')
        .select('*');

    if (error) {
        console.error("Erro ao buscar paradas:", error);
        alert("Não foi possível carregar os dados das paradas.");
        return;
    }

    // 3. Define o centro inicial do mapa
    const centroInicial = { lat: -14.235004, lng: -51.92528 };
    const zoomInicial = 4;

    // 4. Cria o mapa
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: zoomInicial,
        center: centroInicial,
    });

    // NOVO: Inicializa o serviço de Geocoding do Google Maps
    const geocoder = new google.maps.Geocoder();

    let marcadorFoco = null;
    let infoWindowFoco = null;

    // 5. Itera sobre cada parada para criar um marcador (pino)
    paradas.forEach(parada => {
        
        // Função interna para criar o pino e a janela de informações
        // Isso evita repetição de código
        const criarMarcador = (position) => {
            const marker = new google.maps.Marker({
                position: position,
                map: map,
                title: parada.nome,
            });

            const checklistTexto = (parada.checklist || []).join(', ') || 'Nenhuma informação';
            const enderecoTexto = `${parada.logradouro || ''}, ${parada.numero || ''} - ${parada.cidade || ''}/${parada.uf || ''}`;
            const contatoTexto = `${parada.nome_contato || ''} - ${parada.telefone || 'N/A'}`;

            const infoWindowContent = `
                <div style="font-family: sans-serif; max-width: 250px; padding: 5px;">
                    <h3 style="margin: 0 0 8px 0; color: #1b5e20;">${parada.nome}</h3>
                    <p style="margin: 0 0 5px 0;"><strong>Contato:</strong> ${contatoTexto}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Endereço:</strong> ${enderecoTexto}</p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.4;"><strong>Estrutura:</strong> ${checklistTexto}</p>
                </div>
            `;

            const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });

            marker.addListener("click", () => {
                infoWindow.open({ anchor: marker, map });
            });

            if (parada.id === paradaIdFoco) {
                marcadorFoco = marker;
                infoWindowFoco = infoWindow;
            }
        };

        // VERIFICA: A parada já tem coordenadas GPS?
        if (parada.latitude && parada.longitude) {
            const position = {
                lat: parseFloat(parada.latitude),
                lng: parseFloat(parada.longitude)
            };
            criarMarcador(position);
        } 
        // NOVO: Se não tiver GPS, mas tiver endereço, tenta localizar
        else if (parada.logradouro && parada.cidade) {
            const enderecoCompleto = `${parada.logradouro}, ${parada.numero}, ${parada.cidade}, ${parada.uf}`;
            
            geocoder.geocode({ 'address': enderecoCompleto }, (results, status) => {
                if (status === 'OK') {
                    // Se o Google encontrou o endereço, cria o pino com as coordenadas retornadas
                    criarMarcador(results[0].geometry.location);
                } else {
                    console.warn(`Geocode falhou para o endereço "${enderecoCompleto}" pelo motivo: ${status}`);
                }
            });
        }
    });

    // 6. Se encontramos um marcador para focar, centralizamos o mapa nele
    // Usamos um pequeno atraso para dar tempo das buscas de endereço (geocoding) terminarem
    setTimeout(() => {
        if (marcadorFoco) {
            map.setZoom(15);
            map.setCenter(marcadorFoco.getPosition());
            infoWindowFoco.open(map, marcadorFoco);
        }
    }, 1500); // 1.5 segundos de espera
}