import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Path,
  Circle,
  Rect,
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
    flexDirection: "column",
  },
  frontPhoto: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  frontLogoContainer: {
    alignItems: "center",
    paddingTop: 60,
    zIndex: 2,
  },
  frontLogo: {
    width: 200,
    height: 65,
    objectFit: "contain",
  },
  frontSpacer: {
    flex: 1,
  },
  frontNameContainer: {
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  frontFirstName: {
    fontSize: 120,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 2,
    lineHeight: 1.1,
    textAlign: "center",
  },

  // ── BACK PAGE ──
  backPage: {
    backgroundColor: "#ffffff",
    padding: 30,
    paddingBottom: 20,
    fontFamily: "Helvetica",
    justifyContent: "space-between",
  },
  // Header logo
  backHeaderLogo: {
    width: 90,
    height: 28,
    objectFit: "contain",
    alignSelf: "center",
    marginBottom: 3,
  },
  // Name header
  backName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 3,
  },
  // Measurements
  measurementsContainer: {
    alignItems: "center",
    marginBottom: 4,
  },
  measurementsGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "center",
  },
  measurementItem: {
    paddingVertical: 2,
    paddingHorizontal: 5,
    alignItems: "center",
  },
  measurementLabel: {
    fontSize: 7,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: 1,
  },
  measurementValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginBottom: 4,
  },
  // Photos grid: 2x2
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridPhoto: {
    width: "49%",
    height: 295,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 4,
  },
  // Footer
  footerContainer: {
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerContactLeft: {
    alignItems: "flex-start",
  },
  footerText: {
    fontSize: 12,
    color: "#000000",
    marginBottom: 3,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  instagramIcon: {
    marginRight: 5,
  },
  footerQr: {
    width: 70,
    height: 70,
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
        <View style={styles.frontSpacer} />
        {firstName && (
          <View style={styles.frontNameContainer}>
            <Text style={styles.frontFirstName}>{firstName}</Text>
          </View>
        )}
      </Page>

      {/* ═══════════ BACK PAGE ═══════════ */}
      <Page size="LETTER" style={styles.backPage}>
        {/* Top section: Logo + Name + Measurements */}
        <View>
          <Image src={backLogoUrl} style={styles.backHeaderLogo} />
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

          {/* Photos: 2x2 grid */}
          {backPhotos.length > 0 && (
            <View style={styles.photosGrid}>
              {backPhotos.map((photo, i) => (
                <Image key={i} src={photo} style={styles.gridPhoto} />
              ))}
            </View>
          )}
        </View>

        {/* Footer: contact (left) | QR (right) */}
        <View style={styles.footerContainer}>
          <View style={styles.footerContactLeft}>
            <Text style={styles.footerText}>team@examodels.com</Text>
            {model.instagram_name && (
              <View style={styles.footerRow}>
                <Svg width={12} height={12} viewBox="0 0 24 24" style={styles.instagramIcon}>
                  <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#000000" strokeWidth="2" fill="none" />
                  <Circle cx="12" cy="12" r="5" stroke="#000000" strokeWidth="2" fill="none" />
                  <Circle cx="17.5" cy="6.5" r="1.5" fill="#000000" />
                </Svg>
                <Text style={styles.footerText}>{model.instagram_name}</Text>
              </View>
            )}
            {model.username && (
              <Text style={styles.footerText}>examodels.com/{model.username}</Text>
            )}
          </View>
          {qrCodeUrl && (
            <Image src={qrCodeUrl} style={styles.footerQr} />
          )}
        </View>
      </Page>
    </Document>
  );
}
