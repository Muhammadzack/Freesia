// =====================================================================
// FREESIA — RPC RESILIENCE & HEALTH MONITOR
//
// Read-only blockchain access:
// Primary -> Official -> Independent emergency fallback
//
// Wallet signing tetap ditangani wallet.js.
// =====================================================================

const RPC_NETWORK = {
    chainId: CHAIN_ID_EXPECTED,
    name: LITVM_NETWORK.chainName
};

const RPC_HEALTH_TIMEOUT_MS = 4000;
const RPC_HEALTH_INTERVAL_MS = 30000;

const rpcBackends = RPC_ENDPOINTS.map(endpoint => ({
    endpoint,
    provider: new ethers.JsonRpcProvider(
        endpoint.url,
        RPC_NETWORK
    )
}));

const readProvider = new ethers.FallbackProvider(
    rpcBackends.map(({ endpoint, provider }) => ({
        provider,
        priority: endpoint.priority,
        stallTimeout: endpoint.stallTimeout,
        weight: 1
    })),
    RPC_NETWORK,
    {
        quorum: 1
    }
);

// Semua operasi READ Freesia memakai resilient provider.
// Signing / transaction execution tetap memakai signer wallet.
function dataProvider() {
    return readProvider;
}

const rpcHealthState = new Map(
    RPC_ENDPOINTS.map(endpoint => [
        endpoint.id,
        {
            id: endpoint.id,
            label: endpoint.label,
            url: endpoint.url,
            priority: endpoint.priority,

            healthy: null,
            latency: null,
            blockNumber: null,
            chainId: null,
            checkedAt: null,

            failureCount: 0,
            recoveryCount: 0,
            consecutiveFailures: 0,

            lastHealthyAt: null,
            lastFailureAt: null,
            lastError: null
        }
    ])
);

let rpcPreferredId = null;
let rpcPreviousPreferredId = null;

let rpcFailoverCount = 0;
let rpcRecoveryCount = 0;
let rpcLastTransitionAt = null;

function withRpcTimeout(promise, timeoutMs = RPC_HEALTH_TIMEOUT_MS) {
    let timer;

    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`RPC timeout after ${timeoutMs} ms`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeout])
        .finally(() => clearTimeout(timer));
}

function recordRpcProbe(endpoint, probe) {
    const previous = rpcHealthState.get(endpoint.id) || {};

    const wasHealthy = previous.healthy;
    const nowHealthy = probe.healthy === true;

    let failureCount = previous.failureCount || 0;
    let recoveryCount = previous.recoveryCount || 0;
    let consecutiveFailures =
        previous.consecutiveFailures || 0;

    let lastHealthyAt =
        previous.lastHealthyAt || null;

    let lastFailureAt =
        previous.lastFailureAt || null;

    if (nowHealthy) {
        if (wasHealthy === false) {
            recoveryCount += 1;
        }

        consecutiveFailures = 0;
        lastHealthyAt = probe.checkedAt;

    } else {
        failureCount += 1;
        consecutiveFailures += 1;
        lastFailureAt = probe.checkedAt;
    }

    const next = {
        ...previous,
        ...probe,

        priority: endpoint.priority,

        failureCount,
        recoveryCount,
        consecutiveFailures,

        lastHealthyAt,
        lastFailureAt,

        lastError: nowHealthy
            ? null
            : probe.error
    };

    rpcHealthState.set(endpoint.id, next);

    return next;
}

function preferredHealthyRpc(snapshot = getRpcHealthSnapshot()) {
    const healthy = snapshot
        .filter(item => item.healthy === true)
        .sort((a, b) => a.priority - b.priority);

    return healthy[0] || null;
}

function rpcEndpointPriority(id) {
    const endpoint = RPC_ENDPOINTS.find(
        item => item.id === id
    );

    return endpoint
        ? endpoint.priority
        : Number.POSITIVE_INFINITY;
}

function primaryRpcId() {
    const ordered = [...RPC_ENDPOINTS].sort(
        (a, b) => a.priority - b.priority
    );

    return ordered[0]?.id || null;
}

function updateRpcRoutingState() {
    const snapshot = getRpcHealthSnapshot();
    const preferred = preferredHealthyRpc(snapshot);

    const nextId = preferred?.id || null;
    const previousId = rpcPreferredId;
    const primaryId = primaryRpcId();

    // ------------------------------------------------------
    // First observation
    // ------------------------------------------------------
    if (!previousId) {
        rpcPreferredId = nextId;

        // If the application starts while the preferred
        // primary is already unavailable, that is still
        // a real failover condition.
        if (
            nextId &&
            primaryId &&
            nextId !== primaryId
        ) {
            rpcFailoverCount += 1;
            rpcLastTransitionAt = Date.now();
        }

        return;
    }

    // ------------------------------------------------------
    // No change
    // ------------------------------------------------------
    if (previousId === nextId) {
        return;
    }

    rpcPreviousPreferredId = previousId;
    rpcPreferredId = nextId;

    // ------------------------------------------------------
    // All RPCs unavailable
    // ------------------------------------------------------
    if (!nextId) {
        rpcLastTransitionAt = Date.now();
        return;
    }

    const previousPriority =
        rpcEndpointPriority(previousId);

    const nextPriority =
        rpcEndpointPriority(nextId);

    // Higher number = lower priority = failover.
    if (nextPriority > previousPriority) {
        rpcFailoverCount += 1;

    // Lower number = preferred RPC recovered.
    } else if (nextPriority < previousPriority) {
        rpcRecoveryCount += 1;
    }

    rpcLastTransitionAt = Date.now();
}

async function probeRpcBackend(item) {
    const { endpoint, provider } = item;
    const started = performance.now();

    try {
        const [chainIdHex, blockNumber] = await withRpcTimeout(
            Promise.all([
                provider.send('eth_chainId', []),
                provider.getBlockNumber()
            ])
        );

        const latency = Math.round(
            performance.now() - started
        );

        const chainId = Number(BigInt(chainIdHex));
        const healthy = chainId === CHAIN_ID_EXPECTED;

        const result = {
            id: endpoint.id,
            label: endpoint.label,
            url: endpoint.url,
            healthy,
            latency,
            blockNumber,
            chainId,
            checkedAt: Date.now(),
            error: healthy ? null : 'WRONG_CHAIN'
        };

        recordRpcProbe(endpoint, result);

        return result;

    } catch (err) {
        const result = {
            id: endpoint.id,
            label: endpoint.label,
            url: endpoint.url,
            healthy: false,
            latency: Math.round(
                performance.now() - started
            ),
            blockNumber: null,
            chainId: null,
            checkedAt: Date.now(),
            error: String(
                err?.shortMessage ||
                err?.message ||
                err
            ).slice(0, 180)
        };

        recordRpcProbe(endpoint, result);

        return result;
    }
}

async function refreshRpcHealth() {
    const results = await Promise.all(
        rpcBackends.map(probeRpcBackend)
    );

    updateRpcRoutingState();

    const diagnostics = getRpcDiagnostics();

    try {
        window.dispatchEvent(
            new CustomEvent(
                'freesia:rpc-health',
                { detail: diagnostics }
            )
        );
    } catch (e) {}

    return results;
}

function getRpcHealthSnapshot() {
    return RPC_ENDPOINTS.map(endpoint => ({
        ...rpcHealthState.get(endpoint.id)
    }));
}

function getRpcDiagnostics() {
    const endpoints = getRpcHealthSnapshot();

    const preferred = preferredHealthyRpc(
        endpoints
    );

    let mode = 'offline';

    if (preferred) {
        mode = preferred.id === 'primary'
            ? 'primary'
            : 'fallback';
    }

    return {
        mode,

        preferredRpc:
            preferred?.id || null,

        preferredLabel:
            preferred?.label || null,

        previousPreferredRpc:
            rpcPreviousPreferredId,

        failoverCount:
            rpcFailoverCount,

        recoveryCount:
            rpcRecoveryCount,

        lastTransitionAt:
            rpcLastTransitionAt,

        endpoints
    };
}

function printRpcDiagnostics() {
    const diagnostics = getRpcDiagnostics();

    console.log(
        '[Freesia RPC]',
        {
            mode: diagnostics.mode,
            preferredRpc:
                diagnostics.preferredRpc,
            failovers:
                diagnostics.failoverCount,
            recoveries:
                diagnostics.recoveryCount,
            lastTransitionAt:
                diagnostics.lastTransitionAt
        }
    );

    console.table(
        diagnostics.endpoints.map(item => ({
            rpc: item.id,
            priority: item.priority,
            healthy: item.healthy,
            latencyMs: item.latency,
            block: item.blockNumber,

            failures:
                item.failureCount,

            recoveries:
                item.recoveryCount,

            consecutiveFailures:
                item.consecutiveFailures,

            lastError:
                item.lastError
        }))
    );

    return diagnostics;
}

// Diagnostic API untuk DevTools / future monitoring.
// Tidak mengirim data ke server eksternal.
window.FreesiaRPC = {
    health: getRpcDiagnostics,
    refresh: refreshRpcHealth,
    print: printRpcDiagnostics
};

function logRpcHealth() {
    if (!DEBUG) return;

    printRpcDiagnostics();
}

let rpcHealthTimer = null;

function startRpcHealthMonitor() {
    if (rpcHealthTimer) return;

    refreshRpcHealth()
        .then(logRpcHealth)
        .catch(() => {});

    rpcHealthTimer = setInterval(() => {
        if (document.hidden) return;

        refreshRpcHealth()
            .then(logRpcHealth)
            .catch(() => {});
    }, RPC_HEALTH_INTERVAL_MS);
}

function stopRpcHealthMonitor() {
    if (!rpcHealthTimer) return;

    clearInterval(rpcHealthTimer);
    rpcHealthTimer = null;
}

// =====================================================================
// RPC DIAGNOSTIC MODE
// Aktif hanya dengan ?rpcdiag=1
// =====================================================================

function rpcDiagEnabled() {
    try {
        return new URLSearchParams(
            window.location.search
        ).get('rpcdiag') === '1';
    } catch (e) {
        return false;
    }
}

function escapeRpcDiagHtml(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]
    );
}

function rpcDiagStatusIcon(item) {
    if (item.healthy === true) return '✅';
    if (item.healthy === false) return '❌';
    return '⏳';
}

function formatRpcDiagTime(ts) {
    if (!ts) return '—';

    try {
        return new Date(ts).toLocaleTimeString();
    } catch (e) {
        return '—';
    }
}

function renderRpcDiagnosticsPanel() {
    if (!rpcDiagEnabled()) return;

    const diagnostics = getRpcDiagnostics();

    let panel = document.getElementById(
        'freesiaRpcDiagnostics'
    );

    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'freesiaRpcDiagnostics';

        panel.style.cssText = `
            position:fixed;
            left:12px;
            right:12px;
            bottom:12px;
            z-index:2147483647;
            max-width:560px;
            margin:0 auto;
            padding:14px;
            border-radius:16px;
            border:1px solid rgba(120,140,130,.28);
            background:rgba(8,18,15,.94);
            backdrop-filter:blur(18px);
            -webkit-backdrop-filter:blur(18px);
            color:#eaf7ef;
            font-family:ui-monospace,SFMono-Regular,
                Menlo,Monaco,Consolas,monospace;
            font-size:11px;
            line-height:1.5;
            box-shadow:0 18px 50px rgba(0,0,0,.38);
        `;

        document.body.appendChild(panel);
    }

    const rows = diagnostics.endpoints
        .map(item => {
            const latency =
                item.latency != null
                    ? `${item.latency} ms`
                    : '—';

            const safeLabel = escapeRpcDiagHtml(
                item.label || item.id
            );

            const safeError = item.lastError
                ? escapeRpcDiagHtml(item.lastError)
                : '';

            return `
                <div style="
                    display:grid;
                    grid-template-columns:
                        minmax(85px,1fr)
                        38px
                        72px;
                    gap:8px;
                    padding:5px 0;
                    border-top:
                        1px solid rgba(255,255,255,.06);
                ">
                    <span>
                        ${safeLabel}
                    </span>

                    <span>
                        ${rpcDiagStatusIcon(item)}
                    </span>

                    <span style="text-align:right">
                        ${latency}
                    </span>
                </div>

                ${safeError ? `
                    <div style="
                        padding:0 0 6px 0;
                        color:#ff8b8b;
                        font-size:10px;
                        overflow-wrap:anywhere;
                    ">
                        ${safeError}
                    </div>
                ` : ''}
            `;
        })
        .join('');

    const preferred = escapeRpcDiagHtml(
        diagnostics.preferredLabel || 'None'
    );

    const mode =
        diagnostics.mode === 'primary'
            ? 'PRIMARY'
            : diagnostics.mode === 'fallback'
                ? 'FALLBACK'
                : 'OFFLINE';

    panel.innerHTML = `
        <div style="
            display:flex;
            justify-content:space-between;
            gap:12px;
            align-items:center;
            margin-bottom:8px;
        ">
            <strong style="
                font-size:12px;
                color:#75e09a;
            ">
                FREESIA RPC DIAGNOSTICS
            </strong>

            <button
                id="rpcDiagRefresh"
                type="button"
                style="
                    border:0;
                    border-radius:8px;
                    padding:5px 8px;
                    background:rgba(117,224,154,.12);
                    color:#75e09a;
                    font:inherit;
                "
            >
                Refresh
            </button>
        </div>

        <div style="margin-bottom:8px">
            Mode:
            <strong>${mode}</strong><br>

            Preferred:
            <strong>${preferred}</strong><br>

            Failovers:
            <strong>${diagnostics.failoverCount}</strong>

            &nbsp; Recoveries:
            <strong>${diagnostics.recoveryCount}</strong><br>

            Last transition:
            <strong>
                ${formatRpcDiagTime(
                    diagnostics.lastTransitionAt
                )}
            </strong>
        </div>

        ${rows}
    `;

    const refresh =
        document.getElementById('rpcDiagRefresh');

    if (refresh) {
        refresh.onclick = async () => {
            refresh.disabled = true;

            try {
                await refreshRpcHealth();
            } finally {
                refresh.disabled = false;
                renderRpcDiagnosticsPanel();
            }
        };
    }
}

function startRpcDiagnosticsPanel() {
    if (!rpcDiagEnabled()) return;

    renderRpcDiagnosticsPanel();

    window.addEventListener(
        'freesia:rpc-health',
        renderRpcDiagnosticsPanel
    );
}

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        startRpcDiagnosticsPanel,
        { once: true }
    );
} else {
    startRpcDiagnosticsPanel();
}
