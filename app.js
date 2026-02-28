document.addEventListener('DOMContentLoaded', () => {

    // === API Key Management ===
    const apiKeyInput = document.getElementById('gemini-api-key');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const apiBanner = document.getElementById('api-key-banner');

    // Load existing key from Local Storage
    let geminiApiKey = localStorage.getItem('vaigai_gemini_key') || '';
    if (geminiApiKey) {
        apiKeyInput.value = geminiApiKey;
        setApiBannerSuccess();
    }

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            geminiApiKey = key;
            localStorage.setItem('vaigai_gemini_key', key);
            setApiBannerSuccess();
            alert("✅ Gemini API Key successfully saved securely in your browser's local storage.");
        }
    });

    function setApiBannerSuccess() {
        apiBanner.style.borderColor = "#22c55e";
        apiBanner.style.backgroundColor = "#dcfce7";
        apiBanner.querySelector('.banner-icon').textContent = "✅";
        apiBanner.querySelector('strong').textContent = "API Key Saved.";
        apiBanner.querySelector('strong').style.color = "#15803d";
        saveKeyBtn.textContent = "Update Key";
    }

    // === Navigation Logic ===
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    const viewMeta = {
        'classifier': { title: 'Waste Classifier', subtitle: 'Identify waste types and get safe disposal guidance powered by AI.' },
        'report': { title: 'Report Issue', subtitle: 'Help keep the city clean by reporting environmental issues.' },
        'dashboard': { title: 'Municipal Dashboard', subtitle: 'Overview of reported issues and collection efficiency.' },
        'tips': { title: 'Eco-Tips', subtitle: 'Adopt sustainable practices for a greener future.' }
    };

    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            navBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');

            const target = e.currentTarget.dataset.target;
            views.forEach(v => {
                if (v.id === target) {
                    v.classList.remove('hidden-view');
                    v.classList.add('active-view');
                } else {
                    v.classList.remove('active-view');
                    v.classList.add('hidden-view');
                }
            });

            pageTitle.textContent = viewMeta[target].title;
            pageSubtitle.textContent = viewMeta[target].subtitle;
        });
    });

    // === Image Upload Logic ===
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadPrompt = document.getElementById('upload-prompt');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image-btn');

    let base64Image = null;
    let imageMimeType = null;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    removeImageBtn.addEventListener('click', () => {
        resetImageUpload();
    });

    function resetImageUpload() {
        base64Image = null;
        imageMimeType = null;
        fileInput.value = "";
        imagePreview.src = "";
        imagePreviewContainer.classList.add('hidden');
        uploadPrompt.classList.remove('hidden');
    }

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert("Please upload an image file (JPG, PNG).");
            return;
        }
        imageMimeType = file.type;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            base64Image = e.target.result.split(',')[1]; // Extract base64
            uploadPrompt.classList.add('hidden');
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    // === Gemini AI Classification Logic ===
    const classifyBtn = document.getElementById('classify-btn');
    const wasteInput = document.getElementById('waste-input');
    const resultBox = document.getElementById('classification-result');
    const categoryBadge = document.getElementById('category-badge');
    const wasteNameEl = document.getElementById('waste-name');
    const disposalText = document.getElementById('disposal-text');
    const riskText = document.getElementById('risk-text');
    const riskContainer = document.getElementById('risk-container');
    const loadingState = document.getElementById('loading-state');

    const categoryColors = {
        'Biodegradable': 'var(--cat-bio)',
        'Recyclable': 'var(--cat-recycle)',
        'Hazardous': 'var(--cat-hazard)',
        'Biomedical': 'var(--cat-biomed)',
        'E-Waste': 'var(--cat-ewaste)'
    };

    classifyBtn.addEventListener('click', async () => {
        const textValue = wasteInput.value.trim();

        if (!textValue && !base64Image) {
            alert("Please type a description or upload an image to classify.");
            return;
        }

        if (!geminiApiKey) {
            alert("Please enter and save your Google Gemini API Key at the top of the page to use Real AI classification.");
            apiKeyInput.focus();
            return;
        }

        // Show Loading State
        resultBox.classList.add('hidden');
        loadingState.classList.remove('hidden');
        classifyBtn.disabled = true;
        classifyBtn.textContent = "Classifying...";

        try {
            const aiResult = await generateAIResponse(textValue, base64Image, imageMimeType, geminiApiKey);

            // Populate Results
            wasteNameEl.textContent = aiResult.itemName || textValue || "Uploaded Image Item";

            let cat = aiResult.category || "General/Unclassified";
            categoryBadge.textContent = cat;

            // Map color based on keyword inclusion
            let badgeColor = '#6b7280'; // default gray
            for (const [key, color] of Object.entries(categoryColors)) {
                if (cat.toLowerCase().includes(key.toLowerCase())) {
                    badgeColor = color;
                    break;
                }
            }
            categoryBadge.style.backgroundColor = badgeColor;
            resultBox.style.borderLeftColor = badgeColor;

            disposalText.textContent = aiResult.disposalGuidance || "Follow local municipal guidelines.";

            if (aiResult.risks && aiResult.risks.trim() !== "" && aiResult.risks.toLowerCase() !== "none") {
                riskText.textContent = aiResult.risks;
                riskContainer.classList.remove('hidden');
            } else {
                riskContainer.classList.add('hidden');
            }

            // Hide Loading, Show Results
            loadingState.classList.add('hidden');
            resultBox.classList.remove('hidden');

            // Cleanup inputs slightly but keep image to allow reviewing
            wasteInput.value = "";

        } catch (error) {
            console.error(error);
            alert(`AI Analysis Failed: ${error.message}`);
            loadingState.classList.add('hidden');
        } finally {
            classifyBtn.disabled = false;
            classifyBtn.textContent = "Classify with AI";
        }
    });

    async function generateAIResponse(text, imageB64, mimeType, apiKey) {
        // Construct the Gemini 1.5 Flash Endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const systemPrompt = `You are Vaigai AI, an expert waste management assistant. Analyze the provided image and/or text of a waste item. 
        Your goal is to categorize it into strictly ONE of these categories: "Biodegradable", "Recyclable", "Hazardous", "Biomedical", or "E-Waste".
        Provide a concise "itemName", clear instruction for "disposalGuidance", and any "risks" if improperly disposed (leave risks empty if mostly benign).
        RESPOND STRICTLY IN VALID JSON FORMAT matching this schema:
        {
          "itemName": "Specific name of the waste item",
          "category": "One of the 5 categories above",
          "disposalGuidance": "Detailed but concise local disposal instructions",
          "risks": "Any environmental or health risks. Or empty string"
        }`;

        let parts = [{ text: systemPrompt }];

        // Append User Text if present
        if (text) {
            parts.push({ text: `User Description: ${text}` });
        }

        // Append User Image if present
        if (imageB64 && mimeType) {
            parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: imageB64
                }
            });
        }

        const requestBody = {
            contents: [{ parts: parts }],
            // Force JSON output
            generationConfig: {
                response_mime_type: "application/json"
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || response.statusText);
        }

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;

        return JSON.parse(jsonText);
    }

    // === Form Submission Logic ===
    const reportForm = document.getElementById('report-form');
    const successMsg = document.getElementById('report-success');

    reportForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const submitBtn = reportForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting...";

        setTimeout(() => {
            reportForm.reset();
            submitBtn.textContent = "Submit Report to Authorities";
            submitBtn.disabled = false;
            successMsg.classList.remove('hidden');

            setTimeout(() => {
                successMsg.classList.add('hidden');
            }, 5000);
        }, 1200);
    });
});
