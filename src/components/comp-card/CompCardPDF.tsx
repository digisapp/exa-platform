import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  Svg,
  Path,
  Circle,
  Rect,
} from "@react-pdf/renderer";

Font.register({
  family: "BebasNeue",
  src: "https://cdn.jsdelivr.net/fontsource/fonts/bebas-neue@latest/latin-400-normal.ttf",
});

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
  frontLogoUrl?: string; // base64 data URL (white logo for dark background)
  qrCodeUrl?: string; // base64 data URL of QR code
  contactInfo?: {
    email?: string;
    phone?: string;
    instagram?: string;
    website?: string;
  };
}

// 5.5 x 8.5 inches = 396 x 612 points
const CARD_SIZE = { width: 396, height: 612 };

const styles = StyleSheet.create({
  // ── FRONT PAGE ──
  frontPage: {
    backgroundColor: "#000000",
    position: "relative",
    flexDirection: "column",
  },
  frontPhotoWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  frontPhoto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  frontOverlay: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  frontLogoContainer: {
    alignItems: "center",
    paddingTop: 30,
  },
  frontLogo: {
    width: 185,
    height: 60,
    objectFit: "contain",
  },
  frontNameContainer: {
    alignItems: "center",
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  frontFirstName: {
    fontSize: 90,
    fontFamily: "BebasNeue",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 3,
    lineHeight: 1.0,
    textAlign: "center",
  },

  // ── BACK PAGE ──
  backPage: {
    backgroundColor: "#ffffff",
    padding: 20,
    fontFamily: "Helvetica",
  },
  // Name header
  backName: {
    fontSize: 14,
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
    paddingHorizontal: 4,
    alignItems: "center",
  },
  measurementLabel: {
    fontSize: 6,
    color: "#999999",
    textTransform: "uppercase",
    letterSpacing: 0,
    marginBottom: 1,
  },
  measurementValue: {
    fontSize: 9,
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
    height: 222,
    objectFit: "cover",
    borderRadius: 3,
    marginBottom: 4,
  },
  // Footer
  footerContainer: {
    paddingTop: 8,
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
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  instagramIcon: {
    marginRight: 4,
  },
  footerQr: {
    width: 55,
    height: 55,
  },
});

export default function CompCardPDF({ model, photos, frontLogoUrl, qrCodeUrl, contactInfo }: CompCardPDFProps) {
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

  // Determine footer contact info
  const footerEmail = contactInfo?.email || (contactInfo ? undefined : "team@examodels.com");
  const footerPhone = contactInfo?.phone;
  const footerInstagram = contactInfo?.instagram || model.instagram_name;
  const footerWebsite = contactInfo?.website || (contactInfo ? undefined : (model.username ? `examodels.com/${model.username}` : undefined));
  const hasFooter = footerEmail || footerPhone || footerInstagram || footerWebsite || qrCodeUrl;

  return (
    <Document>
      {/* ═══════════ FRONT PAGE ═══════════ */}
      <Page size={CARD_SIZE} style={styles.frontPage}>
        {/* Background photo layer */}
        <View style={styles.frontPhotoWrapper}>
          {heroPhoto && (
            <Image src={heroPhoto} style={styles.frontPhoto} />
          )}
        </View>
        {/* Content overlay layer */}
        <View style={styles.frontOverlay}>
          {frontLogoUrl ? (
            <View style={styles.frontLogoContainer}>
              <Image src={frontLogoUrl} style={styles.frontLogo} />
            </View>
          ) : (
            <View />
          )}
          <View />
          {firstName && (
            <View style={styles.frontNameContainer}>
              <Text style={styles.frontFirstName}>{firstName}</Text>
            </View>
          )}
        </View>
      </Page>

      {/* ═══════════ BACK PAGE ═══════════ */}
      <Page size={CARD_SIZE} style={styles.backPage}>
        {/* Top section: Name + Measurements + Photos */}
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
        {hasFooter && (
          <View style={styles.footerContainer}>
            <View style={styles.footerContactLeft}>
              {footerEmail && (
                <Text style={styles.footerText}>{footerEmail}</Text>
              )}
              {footerPhone && (
                <Text style={styles.footerText}>{footerPhone}</Text>
              )}
              {footerInstagram && (
                <View style={styles.footerRow}>
                  <Svg width={10} height={10} viewBox="0 0 24 24" style={styles.instagramIcon}>
                    <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="#000000" strokeWidth="2" fill="none" />
                    <Circle cx="12" cy="12" r="5" stroke="#000000" strokeWidth="2" fill="none" />
                    <Circle cx="17.5" cy="6.5" r="1.5" fill="#000000" />
                  </Svg>
                  <Text style={styles.footerText}>{footerInstagram}</Text>
                </View>
              )}
              {footerWebsite && (
                <Text style={styles.footerText}>{footerWebsite}</Text>
              )}
            </View>
            {qrCodeUrl && (
              <Image src={qrCodeUrl} style={styles.footerQr} />
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
