import { API_BASE_URL } from '../../../../utils/authStorage';

export const DOCUMENT_TYPES = {
    receipt: {
        title: '영수증',
        en: 'RECEIPT',
        prefix: 'REC',
        party: '고객',
        date: '결제일',
        extraDate: null,
        total: '총 결제 금액',
    },
    invoice: {
        title: '청구서',
        en: 'INVOICE',
        prefix: 'INV',
        party: '청구받는 고객',
        date: '발행일',
        extraDate: '지급 기한',
        total: '총 청구 금액',
    },
    estimate: {
        title: '견적서',
        en: 'ESTIMATE',
        prefix: 'EST',
        party: '견적받는 고객',
        date: '견적일',
        extraDate: '견적 유효기한',
        total: '총 견적 금액',
    },
};

export function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function currencyDigits(currency) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency,
    }).resolvedOptions().maximumFractionDigits;
}

export function money(value, currency) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency,
    }).format(value);
}

export function roundMoney(value, currency) {
    const scale = 10 ** currencyDigits(currency);

    return Math.round((value + Number.EPSILON) * scale) / scale;
}

// 금액을 정수 단위로 변환해 계산합니다.
function previewScaled(value, digits) {
    const text = String(value ?? '');

    if (text.length > 40 || !/^\d+(?:\.\d+)?$/.test(text)) {
        return 0n;
    }

    const [whole, rawFraction = ''] = text.split('.');
    const fraction = rawFraction.replace(/0+$/, '');

    if (fraction.length > digits) {
        return 0n;
    }

    return (
        window.BigInt(whole) * (10n ** window.BigInt(digits)) +
        window.BigInt(fraction.padEnd(digits, '0') || '0')
    );
}

export function calculateRows(items, currency) {
    const digits = currencyDigits(currency);
    const scale = 10 ** digits;

    return items.map((item) => {
        const quantity = previewScaled(item.quantity, 3);
        const price = previewScaled(item.unitPrice, digits);
        const rate = previewScaled(item.taxRate, 2);

        const supplyMinor = (quantity * price + 500n) / 1000n;
        const taxMinor = (supplyMinor * rate + 5000n) / 10000n;

        return {
            ...item,
            supplyMinor: supplyMinor.toString(),
            taxMinor: taxMinor.toString(),
            supply: Number(supplyMinor) / scale,
            tax: Number(taxMinor) / scale,
            total: Number(supplyMinor + taxMinor) / scale,
        };
    });
}

export function calculateTotals(rows, currency) {
    const supplyMinor = rows.reduce(
        (sum, row) => sum + window.BigInt(row.supplyMinor),
        0n
    );

    const taxMinor = rows.reduce(
        (sum, row) => sum + window.BigInt(row.taxMinor),
        0n
    );

    const scale = 10 ** currencyDigits(currency);

    return {
        supply: Number(supplyMinor) / scale,
        tax: Number(taxMinor) / scale,
        total: Number(supplyMinor + taxMinor) / scale,
    };
}

// Finance.css에 실제로 적용된 문서용 규칙을 읽어 인쇄 iframe에도 전달합니다.
// CSS 내용은 이 JS에 중복 저장하지 않습니다.
function collectDocumentStyles(ownerDocument) {
    const visited = new Set();
    function fromSheet(sheet) {
        if (!sheet || sheet.disabled || visited.has(sheet)) return '';
        visited.add(sheet);
        try {
            const text = fromRules(sheet.cssRules);
            const media = sheet.media?.mediaText;
            return text && media && media !== 'all' ? `@media ${media} { ${text} }` : text;
        } catch {
            // 외부 폰트 등 타 출처 스타일시트는 읽을 수 없으므로 제외합니다.
            return '';
        }
    }
    function fromRules(rules) {
        return Array.from(rules || []).map(rule => {
            if (rule.styleSheet) return fromSheet(rule.styleSheet);
            if (/^@page\s+finance-document\b/.test(rule.cssText)) return rule.cssText;
            if (rule.selectorText) {
                return rule.selectorText.includes('.finance-doc-paper') ||
                    rule.selectorText === 'body.finance-document-print' ? rule.cssText : '';
            }
            if (rule.cssRules) {
                const children = fromRules(rule.cssRules);
                if (!children) return '';
                const opening = rule.cssText.indexOf('{');
                return opening >= 0 ? `${rule.cssText.slice(0, opening)}{ ${children} }` : '';
            }
            return '';
        }).filter(Boolean).join('\n');
    }
    const styles = Array.from(ownerDocument.styleSheets).map(fromSheet).filter(Boolean).join('\n');
    if (!styles.includes('.fdp-head')) {
        throw new Error('문서 스타일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
    return styles;
}


export function printDocument(paper, title) {
    if (!paper) {
        throw new Error('인쇄할 문서를 찾을 수 없습니다.');
    }

    const documentStyles = collectDocumentStyles(paper.ownerDocument);

    // 별도 인쇄 iframe에는 부모 화면의 CSS 변수가 상속되지 않으므로
    // 현재 문서에 적용된 공통 색상과 글꼴을 복사합니다.
    const computed = window.getComputedStyle(paper);

    const variableNames = Array.from(
        new Set(
            Array.from(
                documentStyles.matchAll(/var\((--[\w-]+)/g),
                (match) => match[1]
            )
        )
    );

    const themeVariables = variableNames.map((name) => [
        name,
        computed.getPropertyValue(name).trim(),
    ]);

    const documentFont = computed.fontFamily;

    const frame = document.createElement('iframe');
    frame.title = '문서 인쇄';

    frame.style.cssText = [
        'position:fixed',
        'width:1px',
        'height:1px',
        'bottom:0',
        'left:0',
        'border:0',
        'opacity:0',
        'pointer-events:none',
    ].join(';');

    const safeTitle = title.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char]));

    frame.onload = async () => {
        const printWindow = frame.contentWindow;

        if (!printWindow) {
            frame.remove();
            return;
        }

        const printRoot = printWindow.document.documentElement;

        themeVariables.forEach(([name, value]) => {
            if (value) {
                printRoot.style.setProperty(name, value);
            }
        });

        printRoot.style.fontFamily = documentFont;

        let timer;

        const cleanup = () => {
            clearTimeout(timer);
            frame.remove();
        };

        printWindow.onafterprint = cleanup;
        timer = setTimeout(cleanup, 300000);

        if (printWindow.document.fonts) {
            await printWindow.document.fonts.ready;
        }

        printWindow.focus();
        printWindow.print();
    };

    frame.srcdoc = `
        <!doctype html>
        <html lang="ko">
            <head>
                <meta charset="utf-8">
                <title>${safeTitle}</title>
                <style>${documentStyles}</style>
            </head>
            <body class="finance-document-print">${paper.outerHTML}</body>
        </html>
    `;

    document.body.appendChild(frame);
}

const DOCUMENT_API = `${API_BASE_URL}/finance/documents`;

async function documentRequest(url, options = {}) {
    const response = await fetch(url, options);

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error(
            '서버 응답을 읽지 못했습니다. API 주소와 서버 실행 상태를 확인해주세요.'
        );
    }

    if (!response.ok) {
        throw new Error(
            result.message || '문서 요청을 처리하지 못했습니다.'
        );
    }

    return result;
}

export function saveFinanceDocument(payload) {
    return documentRequest(DOCUMENT_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
}

export function getFinanceDocuments({
    page = 1,
    type = '',
    search = '',
    signal,
} = {}) {
    const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        type,
        search,
    });

    return documentRequest(`${DOCUMENT_API}?${params}`, { signal });
}

export function getFinanceDocument(id, signal) {
    return documentRequest(
        `${DOCUMENT_API}/${encodeURIComponent(id)}`,
        { signal }
    );
}

export function getDocumentPartners(signal) {
    return documentRequest(
        `${API_BASE_URL}/finance/partners`,
        { signal }
    );
}