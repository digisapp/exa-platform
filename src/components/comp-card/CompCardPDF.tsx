import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

interface CompCardModel {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  eye_color: string | null;
  hair_color: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  instagram_name: string | null;
  city: string | null;
  state: string | null;
}

interface CompCardPDFProps {
  model: CompCardModel;
  photos: string[]; // base64 data URLs
  frontLogoUrl: string; // base64 data URL (white logo for dark background)
  backLogoUrl: string; // base64 data URL (black logo for white background)
  qrCodeUrl: string; // base64 data URL of QR code
}

const styles = StyleSheet.create({
  // ── FRONT PAGE ──
  frontPage: {
    backgroundColor: "#000000",
    position: "relative",
  },
  frontPhoto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  frontLogoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 45,
    zIndex: 2,
  },
  frontLogo: {
    width: 160,
    height: 52,
    objectFit: "contain",
  },
  frontOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 45,
  },
  frontFirstName: {
    fontSize: 100,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 24,
    lineHeight: 1.1,
    textAlign: "center",
  },
  frontLastName: {
    fontSize: 100,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 24,
    lineHeight: 1.1,
    textAlign: "center",
  },

  // ── BACK PAGE ──
  backPage: {
    backgroundColor: "#ffffff",
    padding: 30,
    paddingBottom: 24,
    fontFamily: "Helvetica",
    justifyContent: "space-between",
  },
  // Name header
  backName: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textTransform: "uppercase",
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 14,
  },
  // Measurements
  measurementsContainer: {
    alignItems: "center",
    marginBottom: 18,
  },
  measurementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  measurementItem: {
    paddingVertical: 5,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  measurementLabel: {
    fontSize: 9,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  measurementValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginBottom: 18,
  },
  // Photos grid: 2x2
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  gridPhoto: {
    width: "48.5%",
    height: 220,
    objectFit: "cover",
    borderRadius: 4,
  },
  // Footer
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 14,
    alignItems: "center",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  footerContactLeft: {
    alignItems: "flex-start",
  },
  footerText: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 2,
  },
  footerQr: {
    width: 70,
    height: 70,
  },
  footerLogo: {
    width: 100,
    height: 34,
    objectFit: "contain",
  },
});

export default function CompCardPDF({ model, photos, frontLogoUrl, backLogoUrl, qrCodeUrl }: CompCardPDFProps) {
  const firstName = model.first_name || "";
  const lastName = model.last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Model";
  const heroPhoto = photos[0];
  const backPhotos = photos.slice(1, 5);

  // Build measurements array - only include filled fields
  const measurements: { label: string; value: string }[] = [];
  if (model.height) measurements.push({ label: "Height", value: model.height });
  if (model.bust) measurements.push({ label: "Bust", value: model.bust });
  if (model.waist) measurements.push({ label: "Waist", value: model.waist });
  if (model.hips) measurements.push({ label: "Hips", value: model.hips });
  if (model.eye_color) measurements.push({ label: "Eyes", value: model.eye_color });
  if (model.hair_color) measurements.push({ label: "Hair", value: model.hair_color });
  if (model.dress_size) measurements.push({ label: "Dress", value: model.dress_size });
  if (model.shoe_size) measurements.push({ label: "Shoes", value: model.shoe_size });

  return (
    <Document>
      {/* ═══════════ FRONT PAGE ═══════════ */}
      <Page size="LETTER" style={styles.frontPage}>
        {heroPhoto && (
          <Image src={heroPhoto} style={styles.frontPhoto} />
        )}
        <View style={styles.frontLogoContainer}>
          <Image src={frontLogoUrl} style={styles.frontLogo} />
        </View>
        <View style={styles.frontOverlay}>
          {firstName && <Text style={styles.frontFirstName}>{firstName}</Text>}
          {lastName && <Text style={styles.frontLastName}>{lastName}</Text>}
        </View>
      </Page>

      {/* ═══════════ BACK PAGE ═══════════ */}
      <Page size="LETTER" style={styles.backPage}>
        {/* Top section: Name + Measurements */}
        <View>
          <Text style={styles.backName}>{fullName}</Text>

          {measurements.length > 0 && (
            <View style={styles.measurementsContainer}>
              <View style={styles.measurementsGrid}>
                {measurements.map((m) => (
                  <View key={m.label} style={styles.measurementItem}>
                    <Text style={styles.measurementLabel}>{m.label}</Text>
                    <Text style={styles.measurementValue}>{m.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Photos: 2x2 grid */}
          {backPhotos.length > 0 && (
            <View style={styles.photosGrid}>
              {backPhotos.map((photo, i) => (
                <Image key={i} src={photo} style={styles.gridPhoto} />
              ))}
            </View>
          )}
        </View>

        {/* Footer: contact (left) + QR (right), then centered logo */}
        <View style={styles.footerContainer}>
          <View style={styles.footerRow}>
            <View style={styles.footerContactLeft}>
              <Text style={styles.footerText}>team@examodels.com</Text>
              {model.instagram_name && (
                <Text style={styles.footerText}>@{model.instagram_name}</Text>
              )}
              {model.username && (
                <Text style={styles.footerText}>examodels.com/{model.username}</Text>
              )}
            </View>
            {qrCodeUrl && (
              <Image src={qrCodeUrl} style={styles.footerQr} />
            )}
          </View>
          <Image src={backLogoUrl} style={styles.footerLogo} />
        </View>
      </Page>
    </Document>
  );
}
