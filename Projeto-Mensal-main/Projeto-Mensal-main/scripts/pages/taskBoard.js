// Importa configurações e utilitários
import { API_BASE_URL } from "../../config/apiConfig.js";
import { getFromLocalStorage } from "../utils/storage.js";

// Seleciona os elementos DOM necessários
const dropdownButton = document.getElementById('dropdown-btn');
const dropdownContent = document.getElementById('dropdown-content');
const columnContainer = document.getElementById('column-container');
const addColumnBtn = document.createElement('button');


// Recupera o e-mail do usuário armazenado
const user = JSON.parse(localStorage.getItem("user"));

document.addEventListener('DOMContentLoaded', () => {
  if (user && user.email) {
    document.getElementById('email-display').innerText = ` ${user.email}`;
  } else {
    document.getElementById('email-display').innerText = "Email não encontrado.";
  }
});

// Configura o botão de nova coluna
addColumnBtn.id = 'add-column-btn';
addColumnBtn.textContent = 'Nova Coluna';
addColumnBtn.style.display = 'none';
columnContainer.parentNode.insertBefore(addColumnBtn, columnContainer.nextSibling);



// Adicionar lógica para mostrar formulário ao lado do botão
addColumnBtn.addEventListener('click', () => {
    const existingForm = document.getElementById('column-form');
    if (existingForm) {
        existingForm.remove(); // Remove o formulário existente, se houver
    }

    const form = document.createElement('div');
    form.id = 'column-form';
    form.innerHTML = `
        <h3>Nova Coluna</h3>
        <form id="new-column-form">
            <label for="column-name">Nome da Coluna:</label>
            <input type="text" id="column-name" name="column-name" required>
            <div class="form-actions">
                <button type="submit">Criar</button>
                <button type="button" id="cancel-column-btn">Cancelar</button>
            </div>
        </form>
    `;

    const rect = addColumnBtn.getBoundingClientRect();
    form.style.position = 'absolute';
    form.style.top = `${rect.top + window.scrollY}px`;
    form.style.left = `${rect.right + 20}px`;
    document.body.appendChild(form);

    form.querySelector('#cancel-column-btn').addEventListener('click', () => {
        form.remove(); // Remove o formulário ao cancelar
    });

    form.querySelector('#new-column-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const columnName = document.getElementById('column-name').value.trim();
        const selectedBoard = dropdownContent.querySelector('a.selected');
        if (!selectedBoard) {
            alert("Por favor, selecione um board primeiro!");
            return;
        }
        if (!columnName) {
            alert("Por favor, insira um nome para a coluna.");
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/Column`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    Name: columnName,
                    BoardId: selectedBoard.id,
                }),
            });
            if (response.ok) {
                alert("Coluna criada com sucesso!");
                form.remove();
                buscarColunas(selectedBoard.id);
            } else {
                alert("Erro ao criar a coluna. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro ao conectar com a API para criar coluna:", error);
            alert("Erro ao criar a coluna. Verifique sua conexão.");
        }
    });
});

// Alterna visibilidade do dropdown e carrega boards ao clicar
dropdownButton.addEventListener('click', async () => {
    const isVisible = dropdownContent.style.display === 'block';
    if (!isVisible) {
        await preencherDropdown(); // Carrega os boards
    }
    dropdownContent.style.display = isVisible ? 'none' : 'block';
});

// Fecha dropdown ao clicar fora
window.addEventListener('click', (event) => {
    if (!event.target.closest('#dropdown-btn') && !event.target.closest('#dropdown-content')) {
        dropdownContent.style.display = 'none';
    }
});
// Função para buscar boards da API e preencher o dropdown
async function preencherDropdown() {
    dropdownContent.innerHTML = '';
    try {
        const response = await fetch(`${API_BASE_URL}/Boards`);
        if (!response.ok) {
            console.error("Erro ao buscar boards.");
            return;
        }
        const boards = await response.json();
        boards.forEach((board) => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<a href="#" id="${board.Id}">${board.Name}</a>`;
            listItem.addEventListener('click', (event) => {
                event.preventDefault();
                dropdownContent.style.display = 'none';
                buscarColunas(board.Id);
                marcarBoardSelecionado(event.target);
            });
            dropdownContent.appendChild(listItem);
        });
        dropdownContent.style.maxHeight = '200px';
        dropdownContent.style.overflowY = 'auto';
    } catch (error) {
        console.error("Erro ao conectar com a API:", error);
    }
}

// Marca o board selecionado e mostra o botão de adicionar coluna
function marcarBoardSelecionado(selected) {
    dropdownContent.querySelectorAll('a').forEach(item => item.classList.remove('selected'));
    selected.classList.add('selected');
    addColumnBtn.style.display = 'block';
}

// Função para buscar colunas por ID do board e preenchê-las
// Função para buscar colunas por ID do board e preenchê-las
async function buscarColunas(boardId) {
    columnContainer.innerHTML = '';
    try {
        const response = await fetch(`${API_BASE_URL}/ColumnByBoardId?BoardId=${boardId}`);
        if (!response.ok) {
            console.error("Erro ao buscar colunas.");
            return;
        }
        const colunas = await response.json();
        colunas.forEach((coluna) => {
            const columnElement = document.createElement('div');
            columnElement.className = 'column';
            columnElement.dataset.columnId = coluna.Id;

            // Adiciona a estrutura da coluna com o botão de excluir
            columnElement.innerHTML = `
                <h3>${coluna.Name}</h3>
                <button class="delete-column-btn" data-column-id="${coluna.Id}">Excluir</button>
                <ul class="tasks-container"></ul>
            `;

            columnContainer.appendChild(columnElement);

            // Adiciona o evento de clique para excluir a coluna
            const deleteButton = columnElement.querySelector('.delete-column-btn');
            deleteButton.addEventListener('click', () => excluirColuna(coluna.Id, columnElement));
            
            buscarTasks(coluna.Id);
        });
    } catch (error) {
        console.error("Erro ao conectar com a API:", error);
    }
}

// Função para excluir coluna
async function excluirColuna(columnId, columnElement) {
    const confirmDelete = confirm("Tem certeza de que deseja excluir esta coluna?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_BASE_URL}/Column?ColumnId=${columnId}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            alert("Coluna excluída com sucesso!");
            columnElement.remove(); // Remove a coluna do DOM
        } else {
            alert("Erro ao excluir a coluna. Tente novamente.");
        }
    } catch (error) {
        console.error("Erro ao conectar com a API para excluir a coluna:", error);
        alert("Erro ao excluir a coluna. Verifique sua conexão.");
    }
}


// Função para buscar tasks por columnId e adicioná-las à coluna correspondente
async function buscarTasks(columnId) {
    try {
        const response = await fetch(`${API_BASE_URL}/TasksByColumnId?ColumnId=${columnId}`);
        if (!response.ok) {
            console.error("Erro ao buscar tasks.");
            return;
        }
        const tasks = await response.json();
        const columnElement = document.querySelector(`.column[data-column-id="${columnId}"]`);
        if (columnElement) {
            const tasksContainer = columnElement.querySelector('.tasks-container');
            tasks.forEach(task => {
                const taskElement = document.createElement('li');
                taskElement.className = 'task';
                taskElement.innerHTML = `<span>${task.Title}</span>`;
                tasksContainer.appendChild(taskElement);
            });
        }
    } catch (error) {
        console.error("Erro ao conectar com a API para buscar tasks:", error);
    }
}


// Seleciona o botão de alternância
const toggleDarkModeBtn = document.getElementById('toggle-dark-mode');

// Função para alternar o modo escuro/claro
function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode'); // Alterna a classe 'dark-mode'
    document.body.style.backgroundColor = isDarkMode ? 'black' : 'white'; // Define o fundo como preto ou branco
    document.body.style.color = isDarkMode ? 'white' : 'black'; // Ajusta a cor do texto para contraste

    // Salva a preferência no localStorage
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');

    // Atualiza o texto do botão
    toggleDarkModeBtn.textContent = isDarkMode ? 'Modo Claro' : 'Modo Escuro';
}

// Adiciona o evento de clique ao botão
toggleDarkModeBtn.addEventListener('click', toggleDarkMode);

// Define o estado inicial com base no localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedMode = localStorage.getItem('darkMode');
    const isDarkMode = savedMode === 'enabled';

    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.style.backgroundColor = isDarkMode ? 'black' : 'white';
    document.body.style.color = isDarkMode ? 'white' : 'black';
    toggleDarkModeBtn.textContent = isDarkMode ? 'Modo Claro' : 'Modo Escuro';
});

