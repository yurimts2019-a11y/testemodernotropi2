document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('loaded');
});

document.addEventListener('DOMContentLoaded', function() {
    
    // ===================================
    // 1. CONFIGURAÇÕES GLOBAIS E LIMITES
    // ===================================
    const DESTINATION_PHONE = '5565999999999'; // <-- 🚨 SUBSTITUA AQUI PELO SEU NÚMERO DE TELEFONE COM DDD
    const EXTRA_LIMIT = 2; // Máximo de adicionais pagos
    const FRUIT_LIMIT = 5; // Máximo de frutas grátis
    const FIDELITY_GOAL = 10; // Meta de pedidos para o cartão fidelidade

    // Utility para formatar preço (i18n)
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };
    
    // Utility para formatar o status de fidelidade em estrelas (NOVO)
    function generateFidelityStars(count, goal) {
        const completedStars = '⭐'.repeat(count);
        // Usamos um círculo branco para representar pedidos restantes, fica melhor no WhatsApp
        const remainingDashes = '⚪'.repeat(goal - count); 
        return completedStars + remainingDashes;
    }

    // 1.1 DADOS DO CARDÁPIO (LISTAS ATUALIZADAS)
    const tamanhos = [
        { nome: '300ml', preco: 16, id: 'tam-p' },
        { nome: '400ml', preco: 20, id: 'tam-m' },
        { nome: '500ml', preco: 24, id: 'tam-g' }
    ];
    // Frutas (Grátis - Máx 5)
    const fruits = ['Abacaxi', 'Morango', 'Mamão', 'Uva', 'Banana', 'Manga', 'Maçã']; 
    // Extras (R$2,00 cada - Adicionais de Frutas - Máx 2)
    const extras = [
        { nome: 'Abacaxi Extra', preco: 2, id: 'extra-abacaxi' }, 
        { nome: 'Morango Extra', preco: 2, id: 'extra-morango' }, 
        { nome: 'Mamão Extra', preco: 2, id: 'extra-mamao' }, 
        { nome: 'Uva Extra', preco: 2, id: 'extra-uva' },
        { nome: 'Banana Extra', preco: 2, id: 'extra-banana' },
        { nome: 'Manga Extra', preco: 2, id: 'extra-manga' },
        { nome: 'Maçã Extra', preco: 2, id: 'extra-maca' }
    ]; 
    const acomp = ['Creme de Maracujá', 'Creme de Ninho', 'Granola', 'Mel', 'Aveia']; 

    // 2. REFERÊNCIAS DO DOM
    const cardsContainer = document.getElementById('cardsContainer');
    const sizeSelectionContainer = document.getElementById('sizeSelectionContainer'); 
    const resumoContent = document.getElementById('resumoContent');
    const footerTotal = document.getElementById('footerTotal');
    const footerConfirmar = document.getElementById('footerConfirmar');
    
    // Modal de Personalização
    const modalOverlay = document.getElementById('customizationModal');
    const modalTotalSpan = document.getElementById('modalTotal');
    const modalResumoDiv = document.getElementById('modalResumo');
    const obsInput = document.getElementById('obsInput');
    const addToOrderBtn = document.getElementById('addToOrder');
    
    // Novo Modal de Checkout
    const checkoutModal = document.getElementById('checkoutModal');
    const checkoutNameInput = document.getElementById('checkoutNameInput'); 
    const checkoutPhoneInput = document.getElementById('checkoutPhoneInput'); 
    const checkoutNeighborhoodInput = document.getElementById('checkoutNeighborhoodInput'); 
    const checkoutConfirmarBtn = document.getElementById('checkoutConfirmarBtn');
    const sealsGrid = document.getElementById('sealsGrid');
    const fidelityMessage = document.getElementById('fidelityMessage');
    
    const storeStatusSpan = document.querySelector('.store-status');

    // 3. ESTADO GLOBAL
    let pedidos = [];
    let itemEmEdicaoIndex = -1; 
    let itemAtual = {};
    let clientData = loadClientData();
    
    // 3.1 FUNÇÕES DE PERSISTÊNCIA (localStorage SIMULANDO DB)
    function loadClientData() {
        try {
            const data = localStorage.getItem('clientFidelityData');
            // Inicializa com dados padrões se não houver dados, ou retorna o JSON
            return data ? JSON.parse(data) : { 
                name: '', 
                phone: '', 
                neighborhood: '', 
                ordersCount: 0 
            };
        } catch (e) {
            console.error("Erro ao carregar dados do localStorage:", e);
            return { name: '', phone: '', neighborhood: '', ordersCount: 0 };
        }
    }
    
    function saveClientData() {
        try {
            localStorage.setItem('clientFidelityData', JSON.stringify(clientData));
        } catch (e) {
            console.error("Erro ao salvar dados no localStorage:", e);
        }
    }


    // 4. LÓGICA DO MODAL DE PERSONALIZAÇÃO
    function openModal(tamanho, index = -1) {
        
        itemEmEdicaoIndex = index;
        
        if(index === -1) {
            obsInput.value = '';
        }

        // Reseta/Inicializa o itemAtual
        itemAtual = {
            tamanho: tamanho,
            fruits: [],
            extras: [],
            acomp: [],
            obs: '',
            quantity: 1, 
            total: tamanho.preco
        };

        if (index !== -1) {
            const itemToEdit = pedidos[index];
            itemAtual = JSON.parse(JSON.stringify(itemToEdit)); 
            
            obsInput.value = itemAtual.obs;

            addToOrderBtn.textContent = `Salvar Alterações - ${formatCurrency(itemAtual.total)}`;
            addToOrderBtn.classList.remove('adicionar');
            addToOrderBtn.classList.add('confirmar');

        } else {
            addToOrderBtn.textContent = `Adicionar ao Pedido - ${formatCurrency(tamanho.preco)}`;
            addToOrderBtn.classList.remove('confirmar');
            addToOrderBtn.classList.add('adicionar');
            addToOrderBtn.disabled = false;
        }

        renderizarOpcoesModal(itemAtual);
        atualizarModalResumo();
        
        // Abre o Modal
        modalOverlay.classList.add('open');
        modalOverlay.focus();
    }

    function closeModal() {
        modalOverlay.classList.remove('open');
        itemEmEdicaoIndex = -1;
    }
    
    function renderizarOpcoesModal(current) {
        // Renderiza as opções de tamanho (apenas para exibição no modal)
        document.getElementById('tamanhosOpcoes').innerHTML = criarChips(
            [current.tamanho], 'tamanho', 'radio', true
        );
        // Frutas
        document.getElementById('frutasOpcoes').innerHTML = criarChips(
            fruits.map(f => ({ nome: f, preco: 0, id: `fruta-${f}` })), 'fruits', 'checkbox', false, 
            current.fruits.map(f => f.nome)
        );
        // Extras
        document.getElementById('extrasOpcoes').innerHTML = criarChips(
            extras, 'extras', 'checkbox', true, 
            current.extras.map(e => e.nome)
        );
        // Acompanhamentos
        document.getElementById('acompOpcoes').innerHTML = criarChips(
            acomp.map(a => ({ nome: a, preco: 0, id: `acomp-${a}` })), 'acomp', 'checkbox', false, 
            current.acomp.map(a => a.nome)
        );

        document.querySelectorAll('.grupo-opcoes .opcoes input').forEach(input => {
            input.removeEventListener('change', handleOpcaoChange);
            input.addEventListener('change', handleOpcaoChange);
        });

        // Atualiza os limites
        atualizarEstadoExtras();
        atualizarEstadoFrutas();
    }
    
    function criarChips(opcoes, grupo, tipo, temPreco, selecionados = []) {
        return opcoes.map(item => {
            const id = item.id || `${grupo}-${item.nome.replace(/\s/g, '-')}`;
            const isChecked = selecionados.includes(item.nome);
            const precoTexto = temPreco && item.preco > 0 ? `<span class="chip-price">+${formatCurrency(item.preco)}</span>` : '';
            
            return `
                <label for="${id}" class="${grupo}">
                    <input type="${tipo}" id="${id}" name="${grupo}" value="${item.nome}" data-price="${item.preco}" ${isChecked ? 'checked' : ''}>
                    <span class="chip-content">${item.nome}${precoTexto}</span>
                </label>
            `;
        }).join('');
    }
    
    function handleOpcaoChange(e) {
        const input = e.target;
        const grupo = input.name;
        const nome = input.value;
        const preco = parseFloat(input.dataset.price);

        // Apenas 'tamanho' é rádio. Todos os outros são checkbox.
        if (input.type === 'radio') {
             const itemTamanho = tamanhos.find(t => t.nome === nome);
             if (itemTamanho) {
                itemAtual.tamanho = itemTamanho;
             }
        } else if (input.type === 'checkbox') {
            
            if (grupo === 'fruits') {
                if (input.checked) {
                    if (itemAtual.fruits.length < FRUIT_LIMIT) {
                        itemAtual.fruits.push({ nome, preco });
                    } else {
                        input.checked = false; 
                    }
                } else {
                    itemAtual.fruits = itemAtual.fruits.filter(f => f.nome !== nome);
                }
                atualizarEstadoFrutas();
            }
            else if (grupo === 'extras') {
                if (input.checked) {
                    if (itemAtual.extras.length < EXTRA_LIMIT) {
                        itemAtual.extras.push({ nome, preco });
                    } else {
                        input.checked = false; 
                    }
                } else {
                    itemAtual.extras = itemAtual.extras.filter(e => e.nome !== nome);
                }
                atualizarEstadoExtras();
            } 
            else { // Acompanhamentos
                if (input.checked) {
                    itemAtual[grupo].push({ nome, preco });
                } else {
                    itemAtual[grupo] = itemAtual[grupo].filter(i => i.nome !== nome);
                }
            }
        }
        atualizarModalResumo();
    }
    
    function atualizarEstadoFrutas() {
        const frutasContainer = document.getElementById('frutasOpcoes');
        const frutasInputs = frutasContainer.querySelectorAll('input[type="checkbox"]');
        const selecionados = itemAtual.fruits.length;

        frutasInputs.forEach(input => {
            const label = input.closest('label');
            if (selecionados >= FRUIT_LIMIT && !input.checked) {
                input.disabled = true;
                label.classList.add('disabled');
            } else {
                input.disabled = false;
                label.classList.remove('disabled');
            }
        });
        
        const title = frutasContainer.closest('.grupo-opcoes').querySelector('.categoria-title');
        title.textContent = `➡️ Escolha as Frutas (Máx ${FRUIT_LIMIT} - Grátis)`;
    }


    function atualizarEstadoExtras() {
        const extrasContainer = document.getElementById('extrasOpcoes');
        const extrasInputs = extrasContainer.querySelectorAll('input[type="checkbox"]');
        const selecionados = itemAtual.extras.length;

        extrasInputs.forEach(input => {
            const label = input.closest('label');
            if (selecionados >= EXTRA_LIMIT && !input.checked) {
                input.disabled = true;
                label.classList.add('disabled');
            } else {
                input.disabled = false;
                label.classList.remove('disabled');
            }
        });
        
        const title = extrasContainer.closest('.grupo-opcoes').querySelector('.categoria-title');
        const precoReferencia = extras.length > 0 ? extras[0].preco : 0; 
        title.textContent = `➕ Adicionais de Frutas (Máx. ${EXTRA_LIMIT} - ${formatCurrency(precoReferencia)} cada)`;
    }

    function atualizarModalResumo() {
        let resumoHTML = '<ul>';
        let subtotal = itemAtual.tamanho.preco; 

        if (itemAtual.tamanho.nome) {
            resumoHTML += `<li>Tamanho: <b>${itemAtual.tamanho.nome}</b></li>`;
            
            if (itemAtual.fruits.length) {
                resumoHTML += `<li>Frutas (Grátis): ${itemAtual.fruits.map(f => f.nome).join(', ')}</li>`;
            }

            if (itemAtual.extras.length) {
                const nomes = itemAtual.extras.map(e => e.nome).join(', ');
                const precoExtras = itemAtual.extras.length * extras[0].preco; 
                subtotal += precoExtras;
                resumoHTML += `<li>Adicionais: ${nomes} (<b>+${formatCurrency(precoExtras)}</b>)</li>`;
            }

            if (itemAtual.acomp.length) {
                resumoHTML += `<li>Acompanhamentos (Grátis): ${itemAtual.acomp.map(a => a.nome).join(', ')}</li>`;
            }

            const obsValue = obsInput.value.trim();
            itemAtual.obs = obsValue;
            if (obsValue) {
                 resumoHTML += `<li>Obs: ${obsValue}</li>`;
            }
            
            itemAtual.total = subtotal; 
            
            addToOrderBtn.disabled = false;

        } else {
            resumoHTML = 'Selecione um tamanho para começar.';
            addToOrderBtn.disabled = true;
            subtotal = 0; 
        }

        resumoHTML += '</ul>';

        modalResumoDiv.innerHTML = resumoHTML;
        modalTotalSpan.textContent = formatCurrency(subtotal); 
        
        const buttonText = itemEmEdicaoIndex === -1 ? 'Adicionar ao Pedido' : 'Salvar Alterações';
        addToOrderBtn.textContent = `${buttonText} - ${formatCurrency(subtotal)}`; 
    }

    // 5. ADICIONAR/SALVAR NO PEDIDO
    function addToOrder() {
        if (!itemAtual.tamanho.nome) return;

        itemAtual.quantity = 1; 

        if (itemEmEdicaoIndex !== -1) {
            pedidos[itemEmEdicaoIndex] = JSON.parse(JSON.stringify(itemAtual));
        } else {
            pedidos.push(JSON.parse(JSON.stringify(itemAtual)));
        }
        
        closeModal();
        renderizarCardsPedidos();
        atualizarResumoGeral();
    }
    
    function renderizarCardsPedidos() {
        if (pedidos.length === 0) {
            cardsContainer.innerHTML = '<p style="text-align:center; color:var(--muted); margin-top: 30px;">Adicione sua primeira Salada!</p>';
            return;
        }

        cardsContainer.innerHTML = '<div class="cards">' + pedidos.map((item, index) => {
            
            const numeroSalada = index + 1;
            const totalItem = item.total; 
            
            let resumoDetalhado = [];
            
            if (item.fruits.length) {
                resumoDetalhado.push(item.fruits.map(f => f.nome).join(', '));
            }
            if (item.extras.length) {
                resumoDetalhado.push(`+ ${item.extras.map(e => e.nome).join(', ')}`);
            }
            if (item.acomp.length) {
                resumoDetalhado.push(`Acomp: ${item.acomp.map(a => a.nome).join(', ')}`);
            }
            if (item.obs) {
                resumoDetalhado.push(`*Obs: ${item.obs}*`);
            }
            
            return `
                <div class="card" onclick="editItem(${index})">
                    <div class="card-top">
                        <img src="salad.svg" alt="Ícone de Salada de Frutas" class="card-img">
                        <div class="card-title">
                            <h3>Salada ${item.tamanho.nome} <span class="salada-number">#${numeroSalada}</span></h3>
                        </div>
                        <button class="btn excluir" onclick="event.stopPropagation(); excluirItem(${index});">X</button>
                    </div>
                    <div class="card-body">
                        <p>${resumoDetalhado.join(' | ')}</p>
                        <span class="card-total">${formatCurrency(totalItem)}</span>
                    </div>
                </div>
            `;
        }).join('') + '</div>';
    }

    function atualizarResumoGeral() {
        let resumoTexto = '';
        let totalPedido = 0;

        if (pedidos.length === 0) {
            resumoContent.textContent = 'Nenhuma Salada adicionada.';
            totalPedido = 0;
        } else {
            resumoTexto += pedidos.map((item, index) => {
                const totalItem = item.total; 
                let linha = `*1x* Salada #${index + 1} (${item.tamanho.nome}): `;
                let detalhes = [];

                if (item.fruits.length) detalhes.push(item.fruits.map(f => f.nome).join(', '));
                if (item.extras.length) detalhes.push(`+${item.extras.map(e => e.nome).join(', ')}`);
                if (item.acomp.length) detalhes.push(`Acomp: ${item.acomp.map(a => a.nome).join(', ')}`);
                if (item.obs) detalhes.push(`Obs: ${item.obs}`);
                
                linha += detalhes.join(' | ') + ` - ${formatCurrency(totalItem)}`;
                totalPedido += totalItem;
                return linha;
            }).join('\n\n'); 

            resumoContent.textContent = resumoTexto;
        }

        resumoContent.parentElement.classList.remove('animate');
        void resumoContent.parentElement.offsetWidth;
        resumoContent.parentElement.classList.add('animate');
        
        footerTotal.textContent = 'TOTAL: '+ formatCurrency(totalPedido);
        
        if (pedidos.length === 0 || !storeStatusSpan.textContent.includes('Aberto')) {
            footerConfirmar.disabled = true;
        } else {
            footerConfirmar.disabled = false;
        }
    }

    function excluirItem(index) {
        pedidos.splice(index, 1);
        renderizarCardsPedidos();
        atualizarResumoGeral();
    }
    
    function editItem(index) {
        openModal(pedidos[index].tamanho, index);
    }

    // 6. LÓGICA DO CARTÃO FIDELIDADE
    function updateFidelityCard() {
        const count = clientData.ordersCount;
        sealsGrid.innerHTML = '';
        
        for (let i = 1; i <= FIDELITY_GOAL; i++) {
            let className = '';
            let content = i;
            if (i < FIDELITY_GOAL) {
                className = i <= count ? 'completed' : '';
            } else {
                // Último selo é a recompensa (AGORA COM TROFÉU)
                className = count >= FIDELITY_GOAL ? 'reward' : '';
                content = count >= FIDELITY_GOAL ? '🏆' : '🏆';
            }
            
            sealsGrid.innerHTML += `
                <div class="seal ${className}"><span>${content}</span></div>
            `;
        }
        
        if (count >= FIDELITY_GOAL) {
            fidelityMessage.innerHTML = '🎉 *PARABÉNS!* Seu próximo pedido será a sua recompensa. 🎉';
            fidelityMessage.style.color = '#e53935';
        } else {
            const remaining = FIDELITY_GOAL - count;
            fidelityMessage.textContent = `Faltam ${remaining} pedidos para você GANHAR a recompensa!`;
            fidelityMessage.style.color = '#795548';
        }
    }

    // 7. LÓGICA DO CHECKOUT (Nova Tela)
    function openCheckoutModal() {
        if (pedidos.length === 0 || !storeStatusSpan.textContent.includes('Aberto')) {
            return;
        }
        
        // Preenche os campos com os últimos dados salvos do cliente (Cadastro automático)
        checkoutNameInput.value = clientData.name;
        checkoutPhoneInput.value = clientData.phone;
        checkoutNeighborhoodInput.value = clientData.neighborhood;
        
        updateFidelityCard();
        checkoutModal.classList.add('open');
        checkoutModal.focus();
    }
    
    function closeCheckoutModal() {
        checkoutModal.classList.remove('open');
    }
    
    // Antiga "enviarPedido", agora apenas abre o modal de checkout
    function preConfirmarPedido() {
        openCheckoutModal();
    }


    // 8. PROCESSAMENTO FINAL DO PEDIDO
    function processarCheckout() {
        const name = checkoutNameInput.value.trim();
        const phone = checkoutPhoneInput.value.trim();
        const neighborhood = checkoutNeighborhoodInput.value.trim();
        
        if (!name || !phone || !neighborhood) {
            alert('Por favor, preencha todos os campos (Nome, Telefone e Bairro) para finalizar o pedido.');
            return;
        }
        
        // 8.1 ATUALIZA E SALVA DADOS DO CLIENTE E FIDELIDADE
        const isRewardOrder = clientData.ordersCount >= FIDELITY_GOAL;
        
        clientData.name = name;
        clientData.phone = phone;
        clientData.neighborhood = neighborhood;
        
        // Se não for pedido de recompensa, incrementa o contador
        if (!isRewardOrder) {
             clientData.ordersCount++;
        }
        
        saveClientData(); // Salva o novo contador
        
        // 8.2 GERA MENSAGEM DO WHATSAPP
        let totalPedido = 0;
        let whatsappText = `*PEDIDO TROPICANA - ${new Date().toLocaleDateString('pt-BR')}*\n\n`;

        whatsappText += `*DADOS DO CLIENTE:*\n`;
        whatsappText += `Nome: ${name}\n`;
        whatsappText += `Telefone: ${phone}\n`;
        whatsappText += `Bairro: ${neighborhood}\n\n`;
        whatsappText += `*ITENS DO PEDIDO:*\n`;

        pedidos.forEach((item, index) => {
            const totalItem = item.total; 
            whatsappText += `*1x SALADA #${index + 1} (${item.tamanho.nome})*\n`;
            if (item.fruits.length) whatsappText += `- Frutas (Grátis): ${item.fruits.map(f => f.nome).join(', ')}\n`;
            
            if (item.extras.length) {
                const nomes = item.extras.map(e => e.nome);
                const precoExtras = item.extras.length * extras[0].preco;
                whatsappText += `- Adicionais de Fruta: ${nomes.join(', ')} (+${formatCurrency(precoExtras)})\n`;
            }
            if (item.acomp.length) whatsappText += `- Acompanhamentos: ${item.acomp.map(a => a.nome).join(', ')}\n`;

            if (item.obs) whatsappText += `- Obs: ${item.obs}\n`;
            whatsappText += `*Total Item: ${formatCurrency(totalItem)}*\n\n`;
            totalPedido += totalItem;
        });

        whatsappText += `*TOTAL GERAL DO PEDIDO: ${formatCurrency(totalPedido)}*\n\n`;
        
        // Mensagem de Fidelidade (AGORA EM FORMATO DE ESTRELAS)
        if (isRewardOrder) {
             whatsappText += `🏆 *PEDIDO RECOMPENSA:* Este pedido foi um presente! 🎁\n`;
             // Reseta o contador após a recompensa
             clientData.ordersCount = 0;
             saveClientData();
        } else {
            const count = clientData.ordersCount;
            const remaining = FIDELITY_GOAL - count;
            const starStatus = generateFidelityStars(count, FIDELITY_GOAL);
            
            whatsappText += `🏆 *CARTÃO FIDELIDADE VIRTUAL:*\n`;
            whatsappText += `Status: ${starStatus}\n`;
            whatsappText += remaining > 0 ? `Faltam apenas ${remaining} pedidos para resgatar sua recompensa!` : `🥳 Parabéns! Você já pode resgatar sua recompensa no próximo pedido!`;
        }


        // 8.3 ENVIO
        const url = `https://wa.me/${DESTINATION_PHONE}?text=${encodeURIComponent(whatsappText)}`;
        window.open(url, '_blank');
        
        // 8.4 LIMPA E FECHA
        pedidos = []; // Limpa o carrinho
        renderizarCardsPedidos();
        atualizarResumoGeral();
        closeCheckoutModal();
    }


    // 9. LISTENERS E INICIALIZAÇÃO
    window.excluirItem = excluirItem; 
    window.openModal = openModal; 
    window.editItem = editItem; 

    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('closeCheckoutModal').addEventListener('click', closeCheckoutModal); 
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    checkoutModal.addEventListener('click', (e) => {
        if (e.target === checkoutModal) {
            closeCheckoutModal();
        }
    });

    addToOrderBtn.addEventListener('click', addToOrder);
    obsInput.addEventListener('input', atualizarModalResumo);
    
    footerConfirmar.addEventListener('click', preConfirmarPedido); // Abre o modal de checkout
    checkoutConfirmarBtn.addEventListener('click', processarCheckout); // Processa o checkout e envia

    // Funções de inicialização 
    function checkStoreStatus() {
        const now = new Date();
        const hour = now.getHours();
        
        // Exemplo: Aberto das 10h às 21:59h
        if (hour >= 10 && hour < 22) {
            storeStatusSpan.textContent = 'Aberto Agora';
            storeStatusSpan.style.backgroundColor = '#e8f5e9';
            storeStatusSpan.style.color = '#2e7d32';
            footerConfirmar.disabled = false;
        } else {
            storeStatusSpan.textContent = 'Fechado';
            storeStatusSpan.style.backgroundColor = '#fff3e0';
            storeStatusSpan.style.color = 'var(--orange)';
            footerConfirmar.disabled = true;
        }
    }
    
    function renderizarSelecaoTamanho() {
        if (!sizeSelectionContainer) return;
        
        sizeSelectionContainer.innerHTML = tamanhos.map(tamanho => {
            const tamanhoJSON = JSON.stringify(tamanho).replace(/"/g, '&quot;');
            
            return `
                <div class="size-card" data-tamanho='${tamanhoJSON}'>
                    <div class="size-info">
                        <h4>Salada de Frutas ${tamanho.nome}</h4>
                        <p>Escolha suas frutas e acompanhamentos!</p>
                    </div>
                    <div class="size-price">${formatCurrency(tamanho.preco)}</div>
                </div>
            `;
        }).join('');
        
        attachSizeCardListeners();
    }
    
    function attachSizeCardListeners() {
        document.querySelectorAll('.size-card').forEach(card => {
            card.removeEventListener('click', handleSizeCardClick);
            card.addEventListener('click', handleSizeCardClick);
        });
    }

    function handleSizeCardClick() {
        try {
            const tamanho = JSON.parse(this.dataset.tamanho.replace(/&quot;/g, '"'));
            openModal(tamanho);
        } catch (e) {
            console.error("Erro ao processar dados do cartão de tamanho:", e);
        }
    }

    renderizarSelecaoTamanho();
    checkStoreStatus();
    setInterval(checkStoreStatus, 60000);
});
