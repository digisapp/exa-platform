// bgremove <input> <output.png> — Apple Vision foreground segmentation to
// transparent PNG. macOS 14+.
import Foundation
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count == 3 else { fputs("usage: bgremove <in> <out.png>\n", stderr); exit(1) }
guard let input = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
  fputs("cannot read input\n", stderr); exit(2)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: input)
do { try handler.perform([request]) } catch {
  fputs("vision failed: \(error)\n", stderr); exit(3)
}
guard let result = request.results?.first, !result.allInstances.isEmpty else {
  fputs("no foreground found\n", stderr); exit(4)
}
let maskBuffer: CVPixelBuffer
do {
  maskBuffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
} catch {
  fputs("mask failed: \(error)\n", stderr); exit(5)
}
let mask = CIImage(cvPixelBuffer: maskBuffer)

let blend = CIFilter(name: "CIBlendWithMask")!
blend.setValue(input, forKey: kCIInputImageKey)
blend.setValue(CIImage(color: .clear).cropped(to: input.extent), forKey: kCIInputBackgroundImageKey)
blend.setValue(mask, forKey: kCIInputMaskImageKey)
guard let output = blend.outputImage else { fputs("blend failed\n", stderr); exit(6) }

let ctx = CIContext()
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
do {
  try ctx.writePNGRepresentation(of: output, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: cs)
} catch {
  fputs("write failed: \(error)\n", stderr); exit(7)
}
