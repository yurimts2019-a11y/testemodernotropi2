document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add('loaded');
});

document.addEventListener('DOMContentLoaded', function() {
    
    // ===================================
    // 1. CONFIGURAÇÕES GLOBAIS E LIMITES
    // ===================================
    const phone = '5565999999999'; // <-- 🚨 SUBSTITUA AQUI PELO SEU NÚMERO DE TELEFONE COM DDD
    const EXTRA_LIMIT = 2; // Limite de adicionais pagos
    const FRUIT_LIMIT = 5; // Limite de frutas grátis
    
    // 1.2 CONFIGURAÇÕES DE FIDELIDADE
    const FIDELIDADE_SEALS_NEEDED = 10;
    // Chave para salvar TUDO no localStorage (MUDANÇA TEMPORÁRIA DE BACKEND)
    const LOCAL_STORAGE_KEY = 'tropicanaLoyaltyCards'; 

    // Utility para formatar preço (i18n)
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    // 1.1 DADOS DO CARDÁPIO (LISTAS ATUALIZADAS)
    const tamanhos = [
        { nome: '300ml', preco: 16, id: 'tam-p' },
        { nome: '400ml', preco: 20, id: 'tam-m' },
        { nome: '500ml', preco: 24, id: 'tam-g' }
    ];
    // Frutas (Grátis - Máx 5)
    const fruits = ['Abacaxi', 'Morango', 'Mamão', 'Uva', 'Banana', 'Manga', 'Maçã']; 
    // Extras (R$3,00 cada - Adicionais de Frutas - Máx 2)
    const extras = [
        { nome: 'Abacaxi Extra', preco: 3, id: 'extra-abacaxi' }, 
        { nome: 'Morango Extra', preco: 3, id: 'extra-morango' }, 
        { nome: 'Mamão Extra', preco: 3, id: 'extra-mamao' }, 
        { nome: 'Uva Extra', preco: 3, id: 'extra-uva' },
        { nome: 'Banana Extra', preco: 3, id: 'extra-banana' },
        { nome: 'Manga Extra', preco: 3, id: 'extra-manga' },
        { nome: 'Maçã Extra', preco: 3, id: 'extra-maca' }
    ]; 
    // Acompanhamentos Secos (Grátis)
    const acomp = ['Creme de Maracujá', 'Creme de Ninho', 'Granola', 'Mel', 'Aveia']; 

    // 2. REFERÊNCIAS DO DOM
    const cardsContainer = document.getElementById('cardsContainer');
    const sizeSelectionContainer = document.getElementById('sizeSelectionContainer'); 
    const resumoContent = document.getElementById('resumoContent');
    const footerTotal = document.getElementById('footerTotal');
    const footerConfirmar = document.getElementById('footerConfirmar');
    const modalOverlay = document.getElementById('customizationModal');
    const modalTotalSpan = document.getElementById('modalTotal');
    const modalResumoDiv = document.getElementById('modalResumo');
    const obsInput = document.getElementById('obsInput');
    const nameInput = document.getElementById('nameInput'); 
    const neighborhoodInput = document.getElementById('neighborhoodInput'); 
    const whatsappInput = document.getElementById('whatsappInput'); // NOVO INPUT
    const quantityInput = document.getElementById('quantityInput'); 
    const addToOrderBtn = document.getElementById('addToOrder');
    const storeStatusSpan = document.querySelector('.store-status');
    
    // NOVAS REFERÊNCIAS FIDELIDADE
    const loyaltyCardContainer = document.getElementById('loyaltyCardContainer');
    const sealsGrid = document.getElementById('sealsGrid');
    const fidelityMessage = document.getElementById('fidelityMessage');


    // 3. ESTADO GLOBAL
    let pedidos = [];
    let itemEmEdicaoIndex = -1; 
    let itemAtual = {};


    // 4. FUNÇÕES DE UTILIDADE E STATUS
    
    function checkStoreStatus() {
        const now = new Date();
        const hour = now.getHours();
        
        // Exemplo: Loja aberta das 10h às 22h
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
    
    // ====================================================
    // NOVAS FUNÇÕES DE FIDELIDADE (USANDO LOCALSTORAGE)
    // ====================================================
    
    // NOVO: A chave agora é o WhatsApp, mais confiável
    function getClientKey(whatsapp) {
        if (!whatsapp) return null;
        // Limpa o número (remove () e -) e usa como chave
        return whatsapp.replace(/[^0-9]/g, '');
    }

    function getLoyaltyData(whatsapp) {
        const key = getClientKey(whatsapp);
        if (!key) return 0;

        try {
            const allData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            // Retorna o número TOTAL de selos acumulados (pode ser > 10)
            return allData[key] || 0; 
        } catch (e) {
            console.error("Erro ao ler loyalty data:", e);
            return 0;
        }
    }

    function saveLoyaltyData(whatsapp, seals) {
        const key = getClientKey(whatsapp);
        if (!key) return;

        try {
            const allData = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
            allData[key] = seals;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allData));
            
            // Após salvar, atualiza o visual do cartão na tela
            renderLoyaltyCard(seals, whatsapp);
        } catch (e) {
            console.error("Erro ao salvar loyalty data:", e);
        }
    }

    function renderLoyaltyCard(totalSeals, whatsapp) {
        // Valida se o número tem pelo menos 11 dígitos limpos (DDD + 9 dígitos)
        const isValidWhatsapp = getClientKey(whatsapp).length >= 11;

        if (!isValidWhatsapp) {
            // Esconde o cartão se o campo de WhatsApp não estiver preenchido corretamente
            loyaltyCardContainer.style.display = 'none';
            return;
        }
        
        loyaltyCardContainer.style.display = 'block';

        // Calcula o progresso do ciclo atual (1 a 10)
        let currentCycleProgress = totalSeals % FIDELIDADE_SEALS_NEEDED;
        if (currentCycleProgress === 0 && totalSeals > 0) {
            currentCycleProgress = FIDELIDADE_SEALS_NEEDED; // Se for 10, mostra 10 selos
        } else if (totalSeals === 0) {
            currentCycleProgress = 0;
        }
        
        let sealsHTML = '';

        for (let i = 1; i <= FIDELIDADE_SEALS_NEEDED; i++) {
            let sealClass = 'seal';
            let content = i;
            
            if (i <= currentCycleProgress) {
                // Selos completos (1 ao 9)
                sealClass += ' completed';
                content = i === FIDELIDADE_SEALS_NEEDED ? '🏆' : '⭐';
            } else if (i === FIDELIDADE_SEALS_NEEDED) {
                // Selo de recompensa vazio
                sealClass += ' reward';
                content = '🏆';
            }

            sealsHTML += `<div class="${sealClass}"><span>${content}</span></div>`;
        }

        sealsGrid.innerHTML = sealsHTML;

        if (totalSeals === 0) {
             fidelityMessage.textContent = `Faça seu primeiro pedido para ganhar o primeiro selo!`;
        } else if (currentCycleProgress < FIDELIDADE_SEALS_NEEDED) {
            const remaining = FIDELIDADE_SEALS_NEEDED - currentCycleProgress;
            fidelityMessage.textContent = `Faltam ${remaining} selo${remaining > 1 ? 's' : ''} para você ganhar sua salada GRÁTIS!`;
        } else {
            fidelityMessage.textContent = '🎉 Parabéns! Sua próxima Salada de Frutas é GRÁTIS!';
        }
    }
    // ====================================================
    // FIM FUNÇÕES DE FIDELIDADE
    // ====================================================
    
    // Função para formatar o input do telefone (UX)
    function formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, ''); // Remove tudo que não for dígito
        
        if (value.length > 0) {
            value = '(' + value;
        }
        if (value.length > 3) {
            value = value.substring(0, 3) + ') ' + value.substring(3);
        }
        if (value.length > 10) {
            value = value.substring(0, 10) + '-' + value.substring(10, 15);
        }
        
        input.value = value;
    }

    // 5. LÓGICA DO MODAL (Não alterada)
    function openModal(tamanho, index = -1) {
        itemEmEdicaoIndex = index;
        
        if(index === -1) {
            quantityInput.value = 1; 
            obsInput.value = '';
        }

        // Inicialização do itemAtual com o tamanho base
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
            // Modo Edição: Carrega dados do item
            const itemToEdit = pedidos[index];
            // Faz uma cópia profunda para não editar o item original diretamente
            itemAtual = JSON.parse(JSON.stringify(itemToEdit)); 
            
            obsInput.value = itemAtual.obs;
            quantityInput.value = itemAtual.quantity;

            // Altera o botão para Salvar
            addToOrderBtn.textContent = `Salvar Alterações - ${formatCurrency(itemAtual.total * itemAtual.quantity)}`;
            addToOrderBtn.classList.remove('adicionar');
            addToOrderBtn.classList.add('confirmar');

        } else {
            // Modo Adicionar Novo
            addToOrderBtn.textContent = `Adicionar ao Pedido - ${formatCurrency(tamanho.preco)}`;
            addToOrderBtn.classList.remove('confirmar');
            addToOrderBtn.classList.add('adicionar');
            addToOrderBtn.disabled = false;
        }

        renderizarOpcoesModal(itemAtual);
        atualizarModalResumo();
        modalOverlay.classList.add('open');
    }

    function closeModal() {
        modalOverlay.classList.remove('open');
        itemEmEdicaoIndex = -1;
    }

    // 6. RENDERIZAÇÃO E LÓGICA DAS OPÇÕES NO MODAL (Não alterada)
    function renderizarOpcoesModal(current) {
        document.getElementById('tamanhosOpcoes').innerHTML = criarChips(
            [current.tamanho], 'tamanho', 'radio', true
        );
        document.getElementById('frutasOpcoes').innerHTML = criarChips(
            fruits.map(f => ({ nome: f, preco: 0, id: `fruta-${f}` })), 'fruits', 'checkbox', false, 
            current.fruits.map(f => f.nome)
        );
        document.getElementById('extrasOpcoes').innerHTML = criarChips(
            extras, 'extras', 'checkbox', true, 
            current.extras.map(e => e.nome)
        );
        document.getElementById('acompOpcoes').innerHTML = criarChips(
            acomp.map(a => ({ nome: a, preco: 0, id: `acomp-${a}` })), 'acomp', 'checkbox', false, 
            current.acomp.map(a => a.nome)
        );

        document.querySelectorAll('.grupo-opcoes .opcoes input').forEach(input => {
            input.removeEventListener('change', handleOpcaoChange);
            input.addEventListener('change', handleOpcaoChange);
        });
        
        quantityInput.removeEventListener('input', handleQuantityChange);
        quantityInput.addEventListener('input', handleQuantityChange);

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

    function handleQuantityChange() {
        let value = parseInt(quantityInput.value);
        if (isNaN(value) || value < 1) {
            value = 1;
        }
        quantityInput.value = value;
        itemAtual.quantity = value;
        atualizarModalResumo();
    }


    function handleOpcaoChange(e) {
        const input = e.target;
        const grupo = input.name;
        const nome = input.value;
        const preco = parseFloat(input.dataset.price);

        if (input.type === 'radio') {
            itemAtual[grupo] = { nome, preco };
        } else if (input.type === 'checkbox') {
            
            // Lógica do limite de Frutas Grátis
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
            
            // Lógica do limite de Adicionais Pagos
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
            
            // Lógica para Acompanhamentos
            else {
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
        let totalGeralItem = 0;

        if (itemAtual.tamanho.nome) {
            resumoHTML += `<li>Tamanho: <b>${itemAtual.tamanho.nome}</b></li>`;
            
            // Frutas Grátis
            if (itemAtual.fruits.length) {
                resumoHTML += `<li>Frutas (Grátis): ${itemAtual.fruits.map(f => f.nome).join(', ')}</li>`;
            }

            // Adicionais de Frutas (Extras)
            if (itemAtual.extras.length) {
                const nomes = itemAtual.extras.map(e => e.nome).join(', ');
                const precoExtras = itemAtual.extras.length * extras[0].preco;
                subtotal += precoExtras;
                resumoHTML += `<li>Adicionais: ${nomes} (<b>+${formatCurrency(precoExtras)}</b>)</li>`;
            }

            // Acompanhamentos
            if (itemAtual.acomp.length) {
                resumoHTML += `<li>Acompanhamentos (Grátis): ${itemAtual.acomp.map(a => a.nome).join(', ')}</li>`;
            }

            // Observações
            const obsValue = obsInput.value.trim();
            itemAtual.obs = obsValue;
            if (obsValue) {
                 resumoHTML += `<li>Obs: ${obsValue}</li>`;
            }
            
            // Quantidade
            resumoHTML += `<li style="margin-top: 10px;">Quantidade: <b>${itemAtual.quantity} x</b></li>`;
            
            itemAtual.total = subtotal; 
            
            totalGeralItem = subtotal * itemAtual.quantity;

            addToOrderBtn.disabled = false;

        } else {
            resumoHTML = 'Selecione um tamanho para começar.';
            addToOrderBtn.disabled = true;
            totalGeralItem = 0;
        }

        resumoHTML += '</ul>';

        
        modalResumoDiv.innerHTML = resumoHTML;
        modalTotalSpan.textContent = formatCurrency(totalGeralItem);
        
        const buttonText = itemEmEdicaoIndex === -1 ? 'Adicionar ao Pedido' : 'Salvar Alterações';
        addToOrderBtn.textContent = `${buttonText} - ${formatCurrency(totalGeralItem)}`;
    }


    // 7. ADICIONAR/SALVAR NO PEDIDO (Não alterada)
    function addToOrder() {
        if (!itemAtual.tamanho.nome) return;

        if (itemEmEdicaoIndex !== -1) {
            pedidos[itemEmEdicaoIndex] = JSON.parse(JSON.stringify(itemAtual));
        } else {
            pedidos.push(JSON.parse(JSON.stringify(itemAtual)));
        }
        
        closeModal();
        renderizarCardsPedidos();
        atualizarResumoGeral();
    }

    // 8. RENDERIZAÇÃO DO CARRINHO (TELA PRINCIPAL - Não alterada)
    function renderizarCardsPedidos() {
        if (pedidos.length === 0) {
            cardsContainer.innerHTML = '<p style="text-align:center; color:var(--muted); margin-top: 30px;">Adicione sua primeira Salada!</p>';
            return;
        }

        cardsContainer.innerHTML = '<div class="cards">' + pedidos.map((item, index) => {
            
            const numeroSalada = index + 1;
            const totalItemMultiplicado = item.total * item.quantity;
            
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
                            <h3>${item.quantity}x Salada ${item.tamanho.nome} <span class="salada-number">#${numeroSalada}</span></h3>
                        </div>
                        <button class="btn excluir" onclick="event.stopPropagation(); excluirItem(${index});">X</button>
                    </div>
                    <div class="card-body">
                        <p>${resumoDetalhado.join(' | ')}</p>
                        <span class="card-total">${formatCurrency(totalItemMultiplicado)}</span>
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
                const totalMultiplicado = item.total * item.quantity;
                let linha = `*${item.quantity}x* Salada #${index + 1} (${item.tamanho.nome}): `;
                let detalhes = [];

                if (item.fruits.length) detalhes.push(item.fruits.map(f => f.nome).join(', '));
                if (item.extras.length) detalhes.push(`+${item.extras.map(e => e.nome).join(', ')}`);
                if (item.acomp.length) detalhes.push(`Acomp: ${item.acomp.map(a => a.nome).join(', ')}`);
                if (item.obs) detalhes.push(`Obs: ${item.obs}`);
                
                linha += detalhes.join(' | ') + ` - ${formatCurrency(totalMultiplicado)}`;
                totalPedido += totalMultiplicado;
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

    // 9. FUNÇÃO DE ENVIO DO PEDIDO (WHATSAPP) - AGORA COM FIDELIDADE
    function enviarPedido() {
        
        if (pedidos.length === 0) {
             alert('Adicione pelo menos um item ao pedido.');
             return;
        }
        
        const name = nameInput.value.trim();
        const neighborhood = neighborhoodInput.value.trim();
        const whatsapp = whatsappInput.value.trim();
        const whatsappKey = getClientKey(whatsapp);

        if (!name || !neighborhood || !whatsapp || whatsappKey.length < 11) {
            alert('Por favor, preencha seu Nome, Endereço e WhatsApp (com DDD) corretamente para prosseguir com o pedido.');
            return;
        }

        let totalPedido = 0;
        let whatsappText = `*PEDIDO TROPICANA - ${new Date().toLocaleDateString('pt-BR')}*\n\n`;

        whatsappText += `*DADOS DO CLIENTE:*\n`;
        whatsappText += `Nome: ${name}\n`;
        whatsappText += `WhatsApp: ${whatsapp}\n`;
        whatsappText += `Endereço: ${neighborhood}\n\n`;
        whatsappText += `*ITENS DO PEDIDO:*\n`;

        pedidos.forEach((item, index) => {
            const totalMultiplicado = item.total * item.quantity;
            whatsappText += `*${item.quantity}x SALADA #${index + 1} (${item.tamanho.nome})*\n`;
            if (item.fruits.length) whatsappText += `- Frutas (Grátis): ${item.fruits.map(f => f.nome).join(', ')}\n`;
            
            if (item.extras.length) {
                const nomes = item.extras.map(e => e.nome);
                const precoExtras = item.extras.length * extras[0].preco;
                whatsappText += `- Adicionais de Fruta: ${nomes.join(', ')} (+${formatCurrency(precoExtras)})\n`;
            }
            if (item.acomp.length) whatsappText += `- Acompanhamentos: ${item.acomp.map(a => a.nome).join(', ')}\n`;

            if (item.obs) whatsappText += `- Obs: ${item.obs}\n`;
            whatsappText += `*Total Item: ${formatCurrency(totalMultiplicado)}*\n\n`;
            totalPedido += totalMultiplicado;
        });

        whatsappText += `*TOTAL GERAL DO PEDIDO: ${formatCurrency(totalPedido)}*`;
        
        // ----------------------------------------------------
        // NOVO: LÓGICA DO CARTÃO FIDELIDADE (SALVAMENTO E MENSAGEM)
        // ----------------------------------------------------
        
        // 1. Obtém o total de selos acumulados (usando a chave do WhatsApp)
        let currentTotalSeals = getLoyaltyData(whatsappKey);
        let newTotalSeals = currentTotalSeals + 1; // Incrementa +1 por pedido

        // 2. Calcula o status para exibição no WhatsApp (1 a 10)
        let sealsCycle = newTotalSeals % FIDELIDADE_SEALS_NEEDED; 
        if (sealsCycle === 0) {
            sealsCycle = FIDELIDADE_SEALS_NEEDED; // Se for 10 ou um múltiplo de 10
        }
        
        const completedSeals = '⭐'.repeat(sealsCycle - 1);
        const emptySeals = '⬜'.repeat(FIDELIDADE_SEALS_NEEDED - sealsCycle);

        let fidelidadeMsg = "\n\n*STATUS DO CARTÃO FIDELIDADE:*\n";
        
        if (sealsCycle < FIDELIDADE_SEALS_NEEDED) {
            // Ciclo em progresso (ex: 3 de 10)
            const remaining = FIDELIDADE_SEALS_NEEDED - sealsCycle;
            
            fidelidadeMsg += `Progresso Atual: ${completedSeals}⭐${emptySeals}\n`; // O último selo é o recém-ganho
            fidelidadeMsg += `Faltam *${remaining}* selo${remaining > 1 ? 's' : ''} para ganhar uma Salada GRÁTIS!`;
            
        } else {
            // Completou o Cartão (10º selo)
            const progressSeals = completedSeals + '🏆';
            fidelidadeMsg += `🎉 Parabéns! Cartão Completo: ${progressSeals}\n`;
            fidelidadeMsg += `Você ganhou uma *Salada de Frutas GRÁTIS* no próximo pedido!`;
        }
        
        // 3. Salva o novo progresso (Total)
        saveLoyaltyData(whatsappKey, newTotalSeals);

        whatsappText += fidelidadeMsg;
        // ----------------------------------------------------
        // FIM DA LÓGICA DE FIDELIDADE
        // ----------------------------------------------------
        
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}`;
        window.open(url, '_blank');
    }

    // 10. RENDERIZAÇÃO INICIAL DA SELEÇÃO DE TAMANHOS (Não alterada)
    function renderizarSelecaoTamanho() {
        if (!sizeSelectionContainer) {
            console.error("Erro: Container 'sizeSelectionContainer' não encontrado no HTML.");
            return;
        }
        
        sizeSelectionContainer.innerHTML = tamanhos.map(tamanho => {
            // Usa data-attributes para armazenar dados JSON com segurança
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
    
    // Função para anexar listeners de forma programática (Não alterada)
    function attachSizeCardListeners() {
        document.querySelectorAll('.size-card').forEach(card => {
            card.removeEventListener('click', handleSizeCardClick);
            card.addEventListener('click', handleSizeCardClick);
        });
    }

    // Função de tratamento de clique isolada (Não alterada)
    function handleSizeCardClick() {
        try {
            // Lê o objeto JSON diretamente do data-attribute
            const tamanho = JSON.parse(this.dataset.tamanho.replace(/&quot;/g, '"'));
            openModal(tamanho);
        } catch (e) {
            console.error("Erro ao processar dados do cartão de tamanho:", e);
        }
    }


    // 11. LISTENERS E INICIALIZAÇÃO
    window.excluirItem = excluirItem; 
    window.openModal = openModal; 
    window.editItem = editItem; 

    document.getElementById('closeModal').addEventListener('click', closeModal);
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    addToOrderBtn.addEventListener('click', addToOrder);
    obsInput.addEventListener('input', atualizarModalResumo);
    
    // NOVO: Adiciona listener para formatar o número e exibir o cartão fidelidade
    whatsappInput.addEventListener('input', (e) => {
        formatPhoneNumber(e.target);
        const seals = getLoyaltyData(e.target.value);
        renderLoyaltyCard(seals, e.target.value);
    }); 
    
    // NOVO: Redesenhado o renderLoyaltyCard para depender apenas do WhatsApp
    nameInput.addEventListener('input', () => {
        const seals = getLoyaltyData(whatsappInput.value);
        renderLoyaltyCard(seals, whatsappInput.value);
    }); 


    footerConfirmar.addEventListener('click', enviarPedido);

    // Inicialização
    renderizarSelecaoTamanho();
    checkStoreStatus();
    setInterval(checkStoreStatus, 60000);
    
    // Inicializa o Cartão Fidelidade ao carregar a página
    const initialSeals = getLoyaltyData(whatsappInput.value);
    renderLoyaltyCard(initialSeals, whatsappInput.value);
});
