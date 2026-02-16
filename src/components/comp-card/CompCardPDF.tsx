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
    paddingTop: 60,
    zIndex: 2,
  },
  frontLogo: {
    width: 200,
    height: 65,
    objectFit: "contain",
  },
  frontNameContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 20,
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
    height: 300,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 4,
  },
  // Footer
  footerContainer: {
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerContactLeft: {
    alignItems: "flex-start",
  },
  footerText: {
    fontSize: 10,
    color: "#000000",
    marginBottom: 2,
  },
  footerQr: {
    width: 50,
    height: 50,
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
      </Page>
    </Document>
  );
}
