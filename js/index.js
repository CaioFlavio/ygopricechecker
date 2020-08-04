'use strict';

// API Related Constants
const api_url = 'https://private-anon-1fb0e41389-yugiohprices.apiary-proxy.com/api/';
const price_by_tag_endpoint = 'price_for_print_tag';

// System Related Constants
const allowed_file_types = 'text/csv';

// Element Related Constants
const priceForm = document.querySelector('#price-form');
const fileInput = document.querySelector('#price-file-input');
document.addEventListener('DOMContentLoaded', function() {
    // INIT Materilaze Selects
    var elems = document.querySelectorAll('select');
    var instances = M.FormSelect.init(elems);
    start();
});

function start(){
    priceFormHandler();
}

function toggleLoader()
{
    document.querySelector('#preloader').classList.toggle('hide');
}

async function getPriceFromApiByCode(cardCode)
{
    const priceByTagEndpoint = `${api_url}${price_by_tag_endpoint}/${cardCode}`;
    let apiCall = await axios.get(priceByTagEndpoint);
    return apiCall.data.data;
}

function getRealPrice(apiValue, dolarValue = 1, percent = 1)
{
    return (apiValue * dolarValue * percent).toFixed(2);
}

function getVariation(storePrice, apiPrice)
{
    return ((1 - ((storePrice) / apiPrice)) * 100).toFixed(2);
}

function getPriceChanges(storePrice, apiPriceData, dolarValue)
{
    let prices = apiPriceData.price_data.data.prices;
    const {high, average, low} = prices;
    
    const high_real = getRealPrice(high, dolarValue);
    const average_real = getRealPrice(average, dolarValue);
    const low_real = getRealPrice(low, dolarValue);
    
    
    return {
        store_price: storePrice,
        high_real: high_real,
        high_dolar: high,
        high_variation: getVariation(storePrice, high_real),
        average_real: average_real,
        average_dolar: average,
        average_variation: getVariation(storePrice, average_real),
        low_real: low_real,
        low_dolar: low,
        low_variation: getVariation(storePrice, low_real),
    };
}

async function parseCSV(fileInput)
{
    let fileContents = await readFile(fileInput.files);
    let parsedFile = Papa.parse(
        fileContents,
        {
            header: true
        } 
    );
    if (parsedFile.errors.length) {
        alert('Formato de arquivo inválido, por favor verificar!');
        return false;
    }
    return parsedFile;
}

async function getPriceData(parsedFile)
{
    const dolarInput = document.querySelector('#dolar');
    let priceLines = [];
    let cardList = parsedFile.data;
    for (let data of cardList) {
        let storePrice = data.store_price;
        let priceData = await getPriceFromApiByCode(data.card_code);
        const {price_data} = priceData;
        let priceChanges = getPriceChanges(storePrice, price_data, dolarInput.value);
        priceLines.push(
            {card_name: priceData.name, card_code: data.card_code, ...priceChanges}
        );
    };
    return priceLines;
}

async function renderTableFields(data)
{
    let tableData = [...data];
    const variationOrder = document.querySelector('#variation-order');
    const variationTable = document.querySelector('#price-table-body');
    variationTable.innerHTML = '';
    tableData.sort((a, b) => {
        switch(variationOrder.value) {
            case ("1"):
                return a.high_variation - b.high_variation;
            break;
            case ("2"): 
                return b.high_variation - a.high_variation;
            break;
            case ("3"):
                return a.average_variation - b.average_variation;
            break;
            case ("4"): 
                return b.average_variation - a.average_variation;
            break;
            case ("5"):
                return a.low_variation - b.low_variation;
            break;
            case ("6"): 
                return b.low_variation - a.low_variation;
            break;
        }
        return a.high_variation - b.high_variation;
    });

    tableData.forEach(data => {
        let newVariationElement = `
            <tr class="versus-match-list">
                <td>#${data.card_code}</td>
                <td>${data.card_name}</td>
                <td>R$ ${data.store_price}</td>
                <td>$ ${data.high_dolar}</td>
                <td>R$ ${data.high_real}</td>
                <td>${data.high_variation}%</td>
                <td>$ ${data.average_dolar}</td>
                <td>R$ ${data.average_real}</td>
                <td>${data.average_variation}%</td>
                <td>$ ${data.low_dolar}</td>
                <td>R$ ${data.low_real}</td>
                <td>${data.low_variation}%</td>
            </tr>
        `
        variationTable.insertAdjacentHTML('beforeend', newVariationElement);
    });
}

async function priceFormHandler(file)
{
    priceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const parsedFile = await parseCSV(fileInput);
        toggleLoader();
        const priceData = await getPriceData(parsedFile);
        renderTableFields(priceData);
        toggleLoader();
    });
}

function readFile(fileNode)
{
    let file = fileNode[0];
    if (file.type && file.type !== allowed_file_types) {
        alert('Tipo de arquivo não suportado.', file.type, file);
        return;
    }
    return readUploadedFileAsText(file);
}

/**
 * Reference: https://blog.shovonhasan.com/using-promises-with-filereader/
*/
function readUploadedFileAsText(inputFile) {
    const temporaryFileReader = new FileReader();
  
    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException("Problem parsing input file."));
      };
  
      temporaryFileReader.onload = () => {
        resolve(temporaryFileReader.result);
      };
      temporaryFileReader.readAsText(inputFile);
    });
};
