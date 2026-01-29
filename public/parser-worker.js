// Web Worker for processing files without freezing the UI

self.onmessage = async (e) => {
    const { file, chunkSize = 1024 * 1024 } = e.data;
    const fileSize = file.size;
    let offset = 0;
    let lineNumber = 0;
    let buffer = '';

    // Stats accumulators
    const topValues = new Map();
    const timeHistogram = new Map();

    // We send batches of lines to main thread to avoid flooding
    let batch = [];
    const BATCH_SIZE = 1000;

    try {
        const reader = new FileReaderSync();

        while (offset < fileSize) {
            const slice = file.slice(offset, offset + chunkSize);
            const chunk = reader.readAsText(slice);
            buffer += chunk;

            const lineBreaks = buffer.split('\n');
            buffer = lineBreaks.pop() || ''; // Keep incomplete line

            for (const line of lineBreaks) {
                const trimmed = line.trim();
                lineNumber++;

                if (trimmed) {
                    const parsed = {
                        lineNumber,
                        content: trimmed,
                        // Basic extraction logic duplicated here for speed
                    };

                    // Extract timestamp (simplified regex for speed)
                    const tsMatch = trimmed.match(/\[(\d{2}\/\w+\/\d{4})/) || trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
                    if (tsMatch) {
                        const dateStr = tsMatch[1];
                        // Just count basic parsing success for histogram for now to save memory
                        // In a full OPFS implementation we'd do more
                    }

                    // Extract Status Code (3 digits surrounded by space)
                    const statusMatch = trimmed.match(/\s(\d{3})\s/);
                    if (statusMatch) {
                        const code = statusMatch[1];
                        topValues.set(code, (topValues.get(code) || 0) + 1);
                    }

                    batch.push(parsed);
                }

                if (batch.length >= BATCH_SIZE) {
                    self.postMessage({ type: 'LINES', lines: batch });
                    batch = [];
                }
            }

            offset += chunkSize;
            const progress = Math.min(100, Math.round((offset / fileSize) * 100));

            // Send Progress & Stats update occasionally
            self.postMessage({
                type: 'PROGRESS',
                progress,
                stats: {
                    totalLines: lineNumber,
                    totalBytes: offset,
                    topValues: Array.from(topValues.entries())
                }
            });
        }

        // Final flush
        if (buffer.trim()) {
            lineNumber++;
            batch.push({ lineNumber, content: buffer.trim() });
        }

        if (batch.length > 0) {
            self.postMessage({ type: 'LINES', lines: batch });
        }

        self.postMessage({
            type: 'DONE',
            stats: {
                totalLines: lineNumber,
                totalBytes: fileSize,
                topValues: Array.from(topValues.entries())
            }
        });

    } catch (err) {
        self.postMessage({ type: 'ERROR', error: String(err) });
    }
};
