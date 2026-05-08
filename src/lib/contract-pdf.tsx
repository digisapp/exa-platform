import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111111",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 28,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
  },
  brand: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    color: "#06b6d4",
  },
  ref: {
    fontSize: 9,
    color: "#71717a",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 18,
    color: "#0a0a0a",
  },
  parties: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  party: {
    flexDirection: "column",
    width: "48%",
  },
  partyLabel: {
    fontSize: 9,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  partyValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  sectionLabel: {
    fontSize: 9,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 6,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.6,
    marginBottom: 20,
  },
  signatureBlock: {
    marginTop: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 6,
    backgroundColor: "#ecfdf5",
  },
  signatureTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#065f46",
    marginBottom: 10,
  },
  signatureRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  signatureKey: {
    width: 110,
    fontSize: 10,
    color: "#065f46",
    fontWeight: 700,
  },
  signatureValue: {
    flex: 1,
    fontSize: 10,
    color: "#065f46",
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#a1a1aa",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 8,
  },
});

interface SignedContractPdfInput {
  contractId: string;
  title: string;
  content: string | null;
  hasOriginalPdf: boolean;
  brandName: string;
  modelName: string;
  signerName: string;
  signerIp: string;
  signedAt: Date;
}

function SignedContractDocument({
  contractId,
  title,
  content,
  hasOriginalPdf,
  brandName,
  modelName,
  signerName,
  signerIp,
  signedAt,
}: SignedContractPdfInput) {
  const formattedDate = signedAt.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>EXA MODELS</Text>
          <Text style={styles.ref}>Contract ID: {contractId}</Text>
        </View>

        <Text style={styles.title}>{title}</Text>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Brand</Text>
            <Text style={styles.partyValue}>{brandName}</Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Model</Text>
            <Text style={styles.partyValue}>{modelName}</Text>
          </View>
        </View>

        {content ? (
          <>
            <Text style={styles.sectionLabel}>Agreement</Text>
            <Text style={styles.body}>{content}</Text>
          </>
        ) : hasOriginalPdf ? (
          <>
            <Text style={styles.sectionLabel}>Agreement</Text>
            <Text style={styles.body}>
              The agreement document was provided as a PDF and is on file with EXA
              Models. This certificate confirms the model&apos;s acceptance of that
              document.
            </Text>
          </>
        ) : null}

        <View style={styles.signatureBlock}>
          <Text style={styles.signatureTitle}>Electronic Signature</Text>
          <View style={styles.signatureRow}>
            <Text style={styles.signatureKey}>Signed by:</Text>
            <Text style={styles.signatureValue}>{signerName}</Text>
          </View>
          <View style={styles.signatureRow}>
            <Text style={styles.signatureKey}>Date &amp; time:</Text>
            <Text style={styles.signatureValue}>{formattedDate}</Text>
          </View>
          <View style={styles.signatureRow}>
            <Text style={styles.signatureKey}>IP address:</Text>
            <Text style={styles.signatureValue}>{signerIp}</Text>
          </View>
          <View style={styles.signatureRow}>
            <Text style={styles.signatureKey}>Method:</Text>
            <Text style={styles.signatureValue}>
              Click-to-sign via examodels.com
            </Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          This certificate was generated by EXA Models. The electronic signature
          above is bound to the signer&apos;s authenticated account, IP address,
          and timestamp.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderSignedContractPdf(
  input: SignedContractPdfInput
): Promise<Buffer> {
  const instance = pdf(<SignedContractDocument {...input} />);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export { signedContractStoragePath } from "./contract-storage";
