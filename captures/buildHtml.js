const fs = require('fs');

const extractInnerCode = (path) => {
    try {
        return fs.readFileSync(path, 'utf8');
    } catch(e) { return ''; }
}

const t1 = extractInnerCode('captures/1_Extraction_Excel.js');
const t2 = extractInnerCode('captures/2_Modelisation_DataWarehouse.sql');
const t3 = extractInnerCode('captures/3_Nettoyage_Donnees.js');
const t4 = extractInnerCode('captures/4_Transformation_Mapping.js');
const t5 = extractInnerCode('captures/5_Connexion_ETL.js');
const t6 = extractInnerCode('captures/6_Dimension_Region.sql');

const sb = extractInnerCode('pharman-ui/src/components/SearchBar.js');
const st = extractInnerCode('pharman-ui/src/components/StockTable.js');
const cm = extractInnerCode('pharman-ui/src/components/CalendrierModal.js');
const sd = extractInnerCode('pharman-ui/src/components/StatsDashboard.js');
const cr = extractInnerCode('pharman-ui/src/components/CompareRegionsModal.js');
const fp = extractInnerCode('pharman-ui/src/components/FicheProduitModal.js');

const safeHtml = (str) => {
    if (!str) return '';
    return str.replace(/</g, '&lt;');
};

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Générateur de Captures PFE</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
    <style>
        body { background-color: #f3f4f6; padding: 2rem; font-family: 'Inter', sans-serif; }
        .window-header { background-color: #e5e7eb; padding: 8px 16px; display: flex; align-items: center; border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .mac-dots { display: flex; gap: 8px; }
        .mac-dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot-red { background-color: #ff5f56; }
        .dot-yellow { background-color: #ffbd2e; }
        .dot-green { background-color: #27c93f; }
        .code-container { background: #1d1f21; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        pre[class*="language-"] { margin: 0; padding: 0; background: transparent; font-size: 14px; line-height: 1.5; border-radius: 0; text-shadow: none; max-height: 700px; }
        .title-bar-text { flex: 1; text-align: center; color: #4b5563; font-size: 0.85rem; font-weight: 600; }
        .capture-wrapper { display: inline-block; border-radius: 8px; overflow: hidden; border: 1px solid #d1d5db; max-width: 1000px; text-align:left;}
    </style>
</head>
<body>
    <div class="max-w-5xl mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-gray-800 text-center">Générateur de Captures de Code (PFE)</h1>
        <div id="snippets-container" class="space-y-12"></div>
    </div>

    <!-- SCRIPTS SECRETS (Plain Text to avoid escaping issues in JS) -->
    <script type="text/plain" id="code-1">${safeHtml(t1)}</script>
    <script type="text/plain" id="code-2">${safeHtml(t2)}</script>
    <script type="text/plain" id="code-3">${safeHtml(t3)}</script>
    <script type="text/plain" id="code-4">${safeHtml(t4)}</script>
    <script type="text/plain" id="code-5">${safeHtml(t5)}</script>
    <script type="text/plain" id="code-6">${safeHtml(t6)}</script>
    
    <script type="text/plain" id="code-7">${safeHtml(sb)}</script>
    <script type="text/plain" id="code-8">${safeHtml(st)}</script>
    <script type="text/plain" id="code-9">${safeHtml(cm)}</script>
    <script type="text/plain" id="code-10">${safeHtml(sd)}</script>
    <script type="text/plain" id="code-11">${safeHtml(cr)}</script>
    <script type="text/plain" id="code-12">${safeHtml(fp)}</script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-jsx.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

    <script>
        const snippets = [
            { id: 'capture-1', title: 'Script pour l\\'extraction des fichiers Excel', lang: 'language-javascript', ref: 'code-1' },
            { id: 'capture-2', title: 'Modélisation du Data Warehouse', lang: 'language-sql', ref: 'code-2' },
            { id: 'capture-3', title: 'Script Nettoyage des Données', lang: 'language-javascript', ref: 'code-3' },
            { id: 'capture-4', title: 'Transformation et Standardisation', lang: 'language-javascript', ref: 'code-4' },
            { id: 'capture-5', title: 'Exécution du pipeline ETL via Node.js', lang: 'language-javascript', ref: 'code-5' },
            { id: 'capture-6', title: 'Création de la Dimension Région', lang: 'language-sql', ref: 'code-6' },
            { id: 'capture-7', title: 'Interface de recherche multicritères (SearchBar.js)', lang: 'language-jsx', ref: 'code-7' },
            { id: 'capture-8', title: 'Résultats de la recherche par code besoin (StockTable.js)', lang: 'language-jsx', ref: 'code-8' },
            { id: 'capture-9', title: 'Prototype du module de suivi des livraisons (CalendrierModal.js)', lang: 'language-jsx', ref: 'code-9' },
            { id: 'capture-10', title: 'Indicateurs de performance (StatsDashboard.js)', lang: 'language-jsx', ref: 'code-10' },
            { id: 'capture-11', title: 'Analyse comparative (CompareRegionsModal.js)', lang: 'language-jsx', ref: 'code-11' },
            { id: 'capture-12', title: 'Fiche Produit (FicheProduitModal.js)', lang: 'language-jsx', ref: 'code-12' }
        ];

        const container = document.getElementById('snippets-container');

        snippets.forEach(item => {
            let strCode = document.getElementById(item.ref).innerHTML;
            strCode = strCode.replace(/&lt;/g, '<');
            
            const blockHtml = document.createElement('div');
            blockHtml.className = 'mb-12 text-center';
            blockHtml.innerHTML = '<h3 class="text-xl font-semibold mb-4 text-gray-700">' + item.title + '</h3>' +
                '<div id="' + item.id + '" class="capture-wrapper shadow-lg">' +
                    '<div class="window-header">' +
                        '<div class="mac-dots"><div class="mac-dot dot-red"></div><div class="mac-dot dot-yellow"></div><div class="mac-dot dot-green"></div></div>' +
                        '<div class="title-bar-text">' + item.title + '</div>' +
                    '</div>' +
                    '<div class="code-container">' +
                        '<pre class="' + item.lang + '"><code></code></pre>' +
                    '</div>' +
                '</div>' +
                '<div class="mt-4">' +
                    '<button id="btn-' + item.id + '" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow-md transition duration-200">' +
                        '📥 Télécharger PNG' +
                    '</button>' +
                '</div>';
                
            blockHtml.querySelector('code').textContent = strCode.trim();
            container.appendChild(blockHtml);
            
            document.getElementById('btn-' + item.id).addEventListener('click', function(e) {
                downloadCapture(item.id, item.title.replace(/[^a-zA-Z0-9]/g, '_'), e.target);
            });
        });

        setTimeout(() => Prism.highlightAll(), 100);

        function downloadCapture(elementId, filename, btn) {
            const element = document.getElementById(elementId);
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Génération en cours...';
            btn.disabled = true;

            html2canvas(element, { scale: 3, backgroundColor: null, logging: false }).then(canvas => {
                const link = document.createElement('a');
                link.download = filename + '.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                btn.innerHTML = '✅ Téléchargé !';
                setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; }, 2000);
            });
        }
    </script>
</body>
</html>`;
fs.writeFileSync('captures/index.html', html);
console.log('index.html generated successfully.');
