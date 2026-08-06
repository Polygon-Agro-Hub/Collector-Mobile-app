import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";

interface PdfViewerProps {
  uri: string;
}

const getPdfHtml = (base64Data: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #f3f4f6;
    }
    body {
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    #pdf-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    canvas {
      width: 100% !important;
      height: auto !important;
      margin-bottom: 15px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      border-radius: 8px;
      background-color: #ffffff;
    }
    #loading {
      font-family: system-ui, -apple-system, sans-serif;
      color: #4b5563;
      font-size: 14px;
      margin-top: 50px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="loading">Loading PDF...</div>
  <div id="pdf-container"></div>
  <script>
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    try {
      const rawData = '${base64Data}';
      if (!rawData) {
        document.getElementById('loading').innerHTML = '<div style="color: #dc2626;">No PDF data provided.</div>';
      } else {
        const pdfData = atob(rawData);
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        loadingTask.promise.then(function(pdf) {
          document.getElementById('loading').style.display = 'none';
          const container = document.getElementById('pdf-container');
          
          let promise = Promise.resolve();
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const num = pageNum;
            promise = promise.then(() => {
              return pdf.getPage(num).then(function(page) {
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                container.appendChild(canvas);

                const renderContext = {
                  canvasContext: context,
                  viewport: viewport
                };
                return page.render(renderContext).promise;
              });
            });
          }
        }).catch(function (error) {
          document.getElementById('loading').innerHTML = '<div style="color: #dc2626; padding: 20px;">Failed to load PDF: ' + (error.message || error) + '</div>';
        });
      }
    } catch (e) {
      document.getElementById('loading').innerHTML = '<div style="color: #dc2626; padding: 20px;">Failed to parse file content.</div>';
    }
  </script>
</body>
</html>
`;

const PdfViewer: React.FC<PdfViewerProps> = ({ uri }) => {
  const [base64, setBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const preparePdf = async () => {
      try {
        setLoading(true);
        setError(null);

        let targetLocalUri = uri;

        // Download remote PDF to local cache if uri is HTTP/HTTPS
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          const fileFilename = `pdf_cache_${Date.now()}.pdf`;
          const destination = `${FileSystem.cacheDirectory}${fileFilename}`;
          const downloadResult = await FileSystem.downloadAsync(uri, destination);
          targetLocalUri = downloadResult.uri;
        }

        const data = await FileSystem.readAsStringAsync(targetLocalUri, {
          encoding: "base64",
        });

        if (active) {
          setBase64(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          console.error("PDF preparation error:", err);
          setError(err?.message || "Could not read PDF file.");
          setLoading(false);
        }
      }
    };

    preparePdf();
    return () => {
      active = false;
    };
  }, [uri]);

  if (loading) {
    return (
      <View style={{ flex: 1, width: "100%", height: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#f3f4f6" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: "#6B7280", fontSize: 13 }}>Loading PDF Preview...</Text>
      </View>
    );
  }

  if (error || !base64) {
    return (
      <View style={{ flex: 1, width: "100%", height: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#f3f4f6", padding: 20 }}>
        <Text style={{ color: "#dc2626", textAlign: "center", fontSize: 14 }}>
          {error || "Failed to load PDF preview"}
        </Text>
      </View>
    );
  }

  return (
    <WebView
      source={{ html: getPdfHtml(base64) }}
      originWhitelist={["*"]}
      style={{ flex: 1, width: "100%", height: "100%", backgroundColor: "#f3f4f6" }}
      containerStyle={{ flex: 1, width: "100%", height: "100%" }}
      startInLoadingState
      renderLoading={() => (
        <View style={StyleSheet.absoluteFill}>
          <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
        </View>
      )}
    />
  );
};

export default PdfViewer;
