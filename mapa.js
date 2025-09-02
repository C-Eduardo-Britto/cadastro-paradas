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
        .select('id, nome, latitude, longitude'); // Pega apenas os dados necessários para o mapa

    if (error) {
        console.error("Erro ao buscar paradas:", error);
        alert("Não foi possível carregar os dados das paradas.");
        return;
    }

    // 3. Define o centro inicial do mapa (centro do Brasil)
    const centroInicial = { lat: -14.235004, lng: -51.92528 };
    const zoomInicial = 4;

    // 4. Cria o mapa
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: zoomInicial,
        center: centroInicial,
    });

    // Variáveis para guardar o marcador que deve receber o foco
    let marcadorFoco = null;
    let infoWindowFoco = null;

    // 5. Cria um marcador (pino) para cada parada
    paradas.forEach(parada => {
        // Pula o registro se não tiver latitude ou longitude
        if (!parada.latitude || !parada.longitude) {
            return;
        }

        const position = {
            lat: parseFloat(parada.latitude),
            lng: parseFloat(parada.longitude)
        };

        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: parada.nome,
        });

        // Cria a janela de informação que abre ao clicar no pino
        const infoWindow = new google.maps.InfoWindow({
            content: `<h3>${parada.nome}</h3>`,
        });

        marker.addListener("click", () => {
            infoWindow.open({
                anchor: marker,
                map,
            });
        });

        // Se o ID desta parada for o que recebemos na URL, guardamos para dar foco
        if (parada.id === paradaIdFoco) {
            marcadorFoco = marker;
            infoWindowFoco = infoWindow;
        }
    });

    // 6. Se encontramos um marcador para focar, centralizamos o mapa nele
    if (marcadorFoco) {
        map.setZoom(15); // Aumenta o zoom
        map.setCenter(marcadorFoco.getPosition()); // Centraliza o mapa no pino
        infoWindowFoco.open(map, marcadorFoco); // Abre a janela de informação
    }
}