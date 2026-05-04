document.addEventListener("DOMContentLoaded", () => {
    const FINNHUB_KEY = "d7h7g2pr01qhiu0aitcgd7h7g2pr01qhiu0aitd0";
    const FRED_KEY = "1a5fa95cb3698bfc82d3368eee8dfe9d";
    
    // Using a CORS proxy for FRED because it blocks direct browser requests
    const CORS_PROXY = "https://corsproxy.io/?";

    // Format helper
    const formatPercent = (num) => {
        if (num === null || num === undefined) return "N/A";
        const val = parseFloat(num);
        return (val > 0 ? "+" : "") + val.toFixed(2) + "%";
    };

    // --- 1. Fetch Global Indices (Finnhub) ---
    async function fetchIndices() {
        const symbols = [
            { sym: "SPY", name: "S&P 500", el: "widget-spy" },
            { sym: "QQQ", name: "Nasdaq 100", el: "widget-qqq" },
            { sym: "DIA", name: "Dow Jones", el: "widget-dia" }
        ];

        for (let idx of symbols) {
            try {
                const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${idx.sym}&token=${FINNHUB_KEY}`);
                const data = await res.json();
                
                const el = document.getElementById(idx.el);
                if (data && data.c) {
                    const changeClass = data.dp >= 0 ? 'positive' : 'negative';
                    el.innerHTML = `
                        <div class="widget-title"><i class="fa-solid fa-chart-line"></i> ${idx.name}</div>
                        <div class="index-value">$${data.c.toFixed(2)}</div>
                        <div class="index-change ${changeClass}">
                            <i class="fa-solid fa-${data.dp >= 0 ? 'arrow-up' : 'arrow-down'}"></i> 
                            ${Math.abs(data.d).toFixed(2)} (${formatPercent(data.dp)})
                        </div>
                    `;
                }
            } catch (err) {
                console.error(`Error fetching ${idx.sym}:`, err);
                document.getElementById(idx.el).innerHTML += `<div class="error">Data unavailable</div>`;
            }
        }
    }

    // --- 2. Fetch Tech Movers (Finnhub) ---
    async function fetchMovers() {
        const basket = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"];
        const moversContainer = document.getElementById("movers-content");
        
        try {
            const promises = basket.map(sym => 
                fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${FINNHUB_KEY}`)
                .then(res => res.json())
                .then(data => ({ sym, dp: data.dp, c: data.c }))
            );
            
            const results = await Promise.all(promises);
            // Sort by daily percentage change descending
            results.sort((a, b) => b.dp - a.dp);

            let html = `<table class="data-table">
                <tr><th>Ticker</th><th>Price</th><th>Change</th></tr>`;
            
            results.forEach(item => {
                const changeClass = item.dp >= 0 ? 'positive' : 'negative';
                html += `
                    <tr>
                        <td><strong>${item.sym}</strong></td>
                        <td>$${item.c.toFixed(2)}</td>
                        <td class="index-change ${changeClass}">${formatPercent(item.dp)}</td>
                    </tr>
                `;
            });
            html += `</table>`;
            moversContainer.innerHTML = html;

        } catch (err) {
            console.error("Error fetching movers:", err);
            moversContainer.innerHTML = `<div class="error">Failed to load market movers.</div>`;
        }
    }

    // --- 3. Fetch Earnings Calendar (Finnhub) ---
    async function fetchEarnings() {
        const earningsContainer = document.getElementById("earnings-content");
        
        // Extended range: Next 60 days to capture more events
        const today = new Date();
        const nextPeriod = new Date();
        nextPeriod.setDate(today.getDate() + 60);
        
        const fromDate = today.toISOString().split('T')[0];
        const toDate = nextPeriod.toISOString().split('T')[0];

        try {
            const res = await fetch(`https://finnhub.io/api/v1/calendar/earnings?from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`);
            const data = await res.json();
            
            if (data && data.earningsCalendar && data.earningsCalendar.length > 0) {
                const targetTickers = [
                    "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL", "NFLX", "AMD", "INTC",
                    "JPM", "BAC", "GS", "MS", "V", "MA", "PYPL", "DIS", "KO", "PEP", "WMT", "COST", 
                    "NKE", "SBUX", "ORCL", "CRM", "ADBE", "CSCO", "ASML", "TSM", "UNH", "HD", "PG"
                ];
                
                // Try filtering first
                let displayList = data.earningsCalendar
                    .filter(e => targetTickers.includes(e.symbol))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                // If the filtered list is too small, fallback to showing the top 10 from the general market
                if (displayList.length < 5) {
                    displayList = data.earningsCalendar
                        .sort((a, b) => new Date(a.date) - new Date(b.date));
                }

                // Final slice
                const final = displayList.slice(0, 10);

                let html = `<table class="data-table">
                    <tr><th>Date</th><th>Ticker</th><th>EPS Est.</th></tr>`;
                
                final.forEach(item => {
                    const isPopular = targetTickers.includes(item.symbol);
                    html += `
                        <tr>
                            <td>${item.date}</td>
                            <td><strong style="color: ${isPopular ? 'var(--accent-1)' : 'inherit'}">${item.symbol}</strong></td>
                            <td>$${item.epsEstimate ? item.epsEstimate.toFixed(2) : 'N/A'}</td>
                        </tr>
                    `;
                });
                html += `</table>`;
                earningsContainer.innerHTML = html;
            } else {
                earningsContainer.innerHTML = `<div style="color: #888; padding: 10px;">No upcoming earnings found.</div>`;
            }
        } catch (err) {
            console.error("Error fetching earnings:", err);
            earningsContainer.innerHTML = `<div class="error">Failed to load earnings calendar.</div>`;
        }
    }

    // --- 4. Fetch Macro Data (FRED API via Proxy) ---
    async function fetchMacro() {
        const series = [
            { id: "CPIAUCSL", name: "US Inflation (CPI)", el: "widget-cpi", suffix: "" },
            { id: "FEDFUNDS", name: "Fed Funds Rate", el: "widget-fed", suffix: "%" },
            { id: "DGS10", name: "10-Year Treasury", el: "widget-10y", suffix: "%" },
            { id: "UNRATE", name: "Unemployment Rate", el: "widget-unrate", suffix: "%" }
        ];

        // Using AllOrigins raw proxy which is often more stable for FRED API
        const ALT_PROXY = "https://api.allorigins.win/raw?url=";

        for (let s of series) {
            try {
                const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${s.id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=2`;
                const proxiedUrl = ALT_PROXY + encodeURIComponent(targetUrl);
                
                const res = await fetch(proxiedUrl);
                if (!res.ok) throw new Error("HTTP Error");
                
                const data = await res.json();
                
                const el = document.getElementById(s.el);
                if (data && data.observations && data.observations.length > 0) {
                    const current = parseFloat(data.observations[0].value);
                    const previous = parseFloat(data.observations[1].value);
                    const date = data.observations[0].date;
                    
                    let diffHtml = "";
                    if (!isNaN(previous) && !isNaN(current)) {
                        const diff = current - previous;
                        const color = s.id === 'CPIAUCSL' || s.id === 'UNRATE' ? 
                            (diff > 0 ? '#ff1744' : '#00e676') : 
                            (diff > 0 ? '#00e676' : '#ff1744');
                        
                        diffHtml = `<span style="font-size: 0.9rem; color: ${color}; margin-left: 10px;">
                            ${diff > 0 ? '+' : ''}${diff.toFixed(2)}${s.suffix}
                        </span>`;
                    }

                    const displayValue = current.toFixed(2) + s.suffix;

                    el.innerHTML = `
                        <div class="widget-title">${el.querySelector('.widget-title').innerHTML}</div>
                        <div class="macro-value">${displayValue} ${diffHtml}</div>
                        <div class="macro-date">Last Updated: ${date}</div>
                    `;
                } else if (data && data.error_message) {
                    el.innerHTML = `<div class="widget-title">${s.name}</div><div style="color: #ff1744; font-size: 0.8rem;">API: ${data.error_message}</div>`;
                }
            } catch (err) {
                console.error(`Error fetching FRED data for ${s.id}:`, err);
                const el = document.getElementById(s.el);
                el.innerHTML = `<div class="widget-title">${s.name}</div><div style="color: #ff1744; font-size: 0.8rem;">Request timeout / blocked</div>`;
            }
        }
    }

    // Execute all fetches
    fetchIndices();
    fetchMovers();
    fetchEarnings();
    fetchMacro();

    // Refresh every 5 minutes
    setInterval(() => {
        fetchIndices();
        fetchMovers();
    }, 5 * 60 * 1000);
});
