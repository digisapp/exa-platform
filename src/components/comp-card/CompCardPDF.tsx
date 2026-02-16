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
  // Logo at top of front page
  frontLogoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 30,
    zIndex: 2,
  },
  frontLogo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  // Dark gradient overlay at the bottom of the front photo
  frontOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  frontFirstName: {
    fontSize: 64,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 14,
    lineHeight: 1.05,
  },
  frontLastName: {
    fontSize: 64,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 14,
    lineHeight: 1.05,
  },

  // ── BACK PAGE ──
  backPage: {
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "Helvetica",
  },
  backLogo: {
    width: 70,
    height: 28,
    objectFit: "contain",
    marginBottom: 16,
  },
  backHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  backName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textTransform: "uppercase",
    letterSpacing: 4,
  },
  // Photos grid: 2x2
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  gridPhoto: {
    width: "48.5%",
    height: 230,
    objectFit: "cover",
    borderRadius: 4,
  },
  // Measurements
  measurementsContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 16,
    marginBottom: 16,
  },
  measurementsTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 10,
  },
  measurementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  measurementItem: {
    width: "25%",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  measurementLabel: {
    fontSize: 8,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  measurementValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  // Contact / Footer
  contactContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  contactText: {
    fontSize: 9,
    color: "#666666",
    marginBottom: 3,
  },
  contactEmail: {
    fontSize: 9,
    color: "#666666",
  },
  footerBrand: {
    fontSize: 10,
    color: "#ec4899",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
  },
});

export default function CompCardPDF({ model, photos, frontLogoUrl, backLogoUrl }: CompCardPDFProps) {
  const firstName = model.first_name || "";
  const lastName = model.last_name || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Model";
  const heroPhoto = photos[0];
  const backPhotos = photos.slice(0, 4);

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
        {/* Full-bleed hero photo */}
        {heroPhoto && (
          <Image src={heroPhoto} style={styles.frontPhoto} />
        )}

        {/* Logo at top center */}
        <View style={styles.frontLogoContainer}>
          <Image src={frontLogoUrl} style={styles.frontLogo} />
        </View>

        {/* Name overlay at the bottom */}
        <View style={styles.frontOverlay}>
          {firstName && <Text style={styles.frontFirstName}>{firstName}</Text>}
          {lastName && <Text style={styles.frontLastName}>{lastName}</Text>}
        </View>
      </Page>

      {/* ═══════════ BACK PAGE ═══════════ */}
      <Page size="LETTER" style={styles.backPage}>
        {/* Header */}
        <View style={styles.backHeader}>
          <Image src={backLogoUrl} style={styles.backLogo} />
          <Text style={styles.backName}>{fullName}</Text>
        </View>

        {/* Photos: 2x2 grid */}
        {backPhotos.length > 0 && (
          <View style={styles.photosGrid}>
            {backPhotos.map((photo, i) => (
              <Image key={i} src={photo} style={styles.gridPhoto} />
            ))}
          </View>
        )}

        {/* Measurements */}
        {measurements.length > 0 && (
          <View style={styles.measurementsContainer}>
            <Text style={styles.measurementsTitle}>Measurements</Text>
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

        {/* Contact Info */}
        <View style={styles.contactContainer}>
          <View>
            {model.instagram_name && (
              <Text style={styles.contactText}>@{model.instagram_name}</Text>
            )}
            {model.username && (
              <Text style={styles.contactText}>examodels.com/{model.username}</Text>
            )}
            <Text style={styles.contactEmail}>team@examodels.com</Text>
          </View>
          <Text style={styles.footerBrand}>EXA MODELS</Text>
        </View>
      </Page>
    </Document>
  );
}
