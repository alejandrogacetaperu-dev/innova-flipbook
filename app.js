
// ==========================================
// INNOVA FLIPBOOK 1.1
// Lector público y descarga de revistas
// ==========================================

const pdfInput = document.getElementById("pdfFile");
const uploadPanel = document.getElementById("uploadPanel");
const readerSection = document.getElementById("readerSection");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const fileInfo = document.getElementById("fileInfo");
const message = document.getElementById("message");

const bookElement = document.getElementById("book");
const pageCounter = document.getElementById("pageCounter");
const pageStatus = document.getElementById("pageStatus");
const documentTitle = document.getElementById("documentTitle");
const downloadPdf = document.getElementById("downloadPdf");

let pageFlip = null;
let totalPages = 0;
let currentFile = null;
let currentObjectURL = null;

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


// ==========================================
// 1. SELECCIONAR PDF LOCAL
// ==========================================

pdfInput.addEventListener("change", async function () {

    const file = this.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
        showMessage("Selecciona un archivo PDF.");
        return;
    }

    if (file.size > 100 * 1024 * 1024) {
        showMessage("El archivo supera los 100 MB.");
        return;
    }

    currentFile = file;

    fileInfo.textContent =
        `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

    await convertPDF(file, file.name);
});


// ==========================================
// 2. CONVERTIR PDF LOCAL O PUBLICADO
// ==========================================

async function convertPDF(source, filename) {

    showLoading(true);
    showMessage("");

    uploadPanel.style.display = "none";
    readerSection.style.display = "none";

    try {

        if (pageFlip) {
            pageFlip.destroy();
            pageFlip = null;
        }

        bookElement.innerHTML = "";

        let pdf;

        if (typeof source === "string") {

            pdf = await pdfjsLib.getDocument({
                url: source
            }).promise;

        } else {

            const buffer = await source.arrayBuffer();

            pdf = await pdfjsLib.getDocument({
                data: new Uint8Array(buffer)
            }).promise;

        }

        totalPages = pdf.numPages;

        documentTitle.textContent =
            filename.replace(/\.pdf$/i, "");

        pageStatus.textContent =
            `${totalPages} páginas disponibles`;

        // Renderizar páginas

        for (let i = 1; i <= totalPages; i++) {

            loadingText.textContent =
                `Procesando página ${i} de ${totalPages}...`;

            const pdfPage = await pdf.getPage(i);

            const viewport = pdfPage.getViewport({
                scale: 1.5
            });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await pdfPage.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const page = document.createElement("div");

            page.className = "page";

            page.dataset.density =
                (i === 1 || i === totalPages)
                    ? "hard"
                    : "soft";

            page.appendChild(canvas);

            bookElement.appendChild(page);
        }

        // Preparar descarga

        prepareDownload(source, filename);

        readerSection.style.display = "block";

        initializeFlipbook();

        showLoading(false);

        updatePageCounter();

    } catch (error) {

        console.error(error);

        showLoading(false);
        uploadPanel.style.display = "block";

        showMessage(
            "Error al abrir la revista. Comprueba el archivo o el enlace."
        );

    }
}


// ==========================================
// 3. PREPARAR DESCARGA DEL PDF
// ==========================================

function prepareDownload(source, filename) {

    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
        currentObjectURL = null;
    }

    if (typeof source === "string") {

        downloadPdf.href = source;

    } else {

        currentObjectURL = URL.createObjectURL(source);

        downloadPdf.href = currentObjectURL;

    }

    downloadPdf.download = filename;
    downloadPdf.style.display = "inline-block";

}


// ==========================================
// 4. INICIALIZAR FLIPBOOK
// ==========================================

function initializeFlipbook() {

    const pages = bookElement.querySelectorAll(".page");

    if (!pages.length) return;

    pageFlip = new St.PageFlip(bookElement, {

        width: 520,
        height: 735,

        size: "stretch",

        minWidth: 280,
        maxWidth: 520,

        minHeight: 396,
        maxHeight: 735,

        drawShadow: true,
        flippingTime: 800,

        usePortrait: true,
        startPage: 0,

        autoSize: true,
        maxShadowOpacity: 0.5,

        showCover: true,
        mobileScrollSupport: false

    });

    pageFlip.loadFromHTML(pages);

    pageFlip.on("flip", updatePageCounter);

}


// ==========================================
// 5. CONTADOR DE PÁGINAS
// ==========================================

function updatePageCounter() {

    if (!pageFlip) return;

    const current =
        pageFlip.getCurrentPageIndex() + 1;

    pageCounter.textContent =
        `${current} / ${totalPages}`;

    pageStatus.textContent =
        `Página ${current} de ${totalPages}`;

}


// ==========================================
// 6. NAVEGACIÓN
// ==========================================

document.getElementById("nextPage")
    .addEventListener("click", () => {

        if (pageFlip) pageFlip.flipNext();

    });

document.getElementById("prevPage")
    .addEventListener("click", () => {

        if (pageFlip) pageFlip.flipPrev();

    });

document.getElementById("firstPage")
    .addEventListener("click", () => {

        if (pageFlip) pageFlip.turnToPage(0);

    });

document.getElementById("lastPage")
    .addEventListener("click", () => {

        if (pageFlip) {
            pageFlip.turnToPage(totalPages - 1);
        }

    });


// ==========================================
// 7. PANTALLA COMPLETA
// ==========================================

document.getElementById("fullscreen")
    .addEventListener("click", async () => {

        try {

            if (!document.fullscreenElement) {

                await readerSection.requestFullscreen();

            } else {

                await document.exitFullscreen();

            }

        } catch (error) {

            showMessage("No se pudo activar pantalla completa.");

        }

    });


// ==========================================
// 8. CAMBIAR DOCUMENTO
// ==========================================

document.getElementById("changeFile")
    .addEventListener("click", () => {

        if (pageFlip) {
            pageFlip.destroy();
            pageFlip = null;
        }

        if (currentObjectURL) {
            URL.revokeObjectURL(currentObjectURL);
            currentObjectURL = null;
        }

        window.location.href = window.location.pathname;

    });


// ==========================================
// 9. CARGAR REVISTA DESDE ENLACE
// ==========================================

async function loadPublishedMagazine() {

    const params = new URLSearchParams(
        window.location.search
    );

    const pdfPath = params.get("pdf");

    if (!pdfPath) return;

    try {

        const pdfURL = new URL(pdfPath, window.location.href);

        // Solo aceptar archivos del mismo sitio público

        if (pdfURL.origin !== window.location.origin) {
            throw new Error("El PDF debe estar alojado en este sitio.");
        }

        const filename =
            decodeURIComponent(
                pdfURL.pathname.split("/").pop()
            );

        await convertPDF(pdfURL.href, filename);

    } catch (error) {

        console.error(error);

        showMessage("No se pudo localizar la revista publicada.");

    }

}


// ==========================================
// 10. FUNCIONES AUXILIARES
// ==========================================

function showLoading(show) {

    loading.style.display =
        show ? "block" : "none";

}

function showMessage(text) {

    message.textContent = text;

}


// Iniciar la aplicación

loadPublishedMagazine();
