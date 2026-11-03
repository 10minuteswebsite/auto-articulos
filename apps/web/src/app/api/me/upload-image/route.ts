import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@auto-articulos/db";
import { getCurrentUserId } from "@/lib/current-user";

// Las fotos sí necesitan una composición fija. Los logos no: un lienzo fijo
// puede hacer que el consumidor confunda el margen con parte de la marca y
// una transformación posterior puede deformar o eliminar detalles blancos.
// Para logos solo se define un máximo de seguridad; se conserva la proporción
// original, el canal alfa y el tamaño si ya cabe.
const TARGET = {
  profile: { width: 600, height: 600 },
  logo: { width: 1600, height: 800 },
} as const;

type UploadType = "profile" | "profile2" | "profile3" | "logo" | "logo2";
const UPLOAD_TYPES: UploadType[] = ["profile", "profile2", "profile3", "logo", "logo2"];

// Hasta 3 fotos del usuario y 2 logos distintos (p.ej. horizontal + cuadrado)
// para que el generador de imágenes de redes sociales tenga variedad real de
// dónde elegir en vez de una sola foto/logo fijos.
const FIELD_BY_TYPE: Record<UploadType, "profilePhotoUrl" | "profilePhotoUrl2" | "profilePhotoUrl3" | "businessLogoUrl" | "businessLogoUrl2"> = {
  profile: "profilePhotoUrl",
  profile2: "profilePhotoUrl2",
  profile3: "profilePhotoUrl3",
  logo: "businessLogoUrl",
  logo2: "businessLogoUrl2",
};

const BLOB_PREFIX_BY_TYPE: Record<UploadType, string> = {
  profile: "profile-photos",
  profile2: "profile-photos-2",
  profile3: "profile-photos-3",
  logo: "business-logos",
  logo2: "business-logos-2",
};

function isProfileType(type: UploadType): boolean {
  return type === "profile" || type === "profile2" || type === "profile3";
}

// Límite duro de entrada (4MB). sharp lo comprime al guardar, así que el
// peso final siempre termina muy por debajo de esto.
const MAX_INPUT_BYTES = 4 * 1024 * 1024;

// Las fotos se mantienen pequeñas. En logos priorizamos fidelidad lossless;
// el límite sigue evitando subir archivos accidentalmente enormes.
const MAX_OUTPUT_BYTES = 200 * 1024;
const MAX_LOGO_OUTPUT_BYTES = 1024 * 1024;

// Formatos de entrada aceptados. Para el OUTPUT usamos JPEG para fotos
// (mucho más liviano que PNG) y PNG para logos (preserva transparencia).
const ALLOWED_INPUT_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  const formData = await request.formData();
  const rawType = formData.get("type");
  const file = formData.get("file");

  if (typeof rawType !== "string" || !UPLOAD_TYPES.includes(rawType as UploadType)) {
    return NextResponse.json(
      { error: `type debe ser uno de: ${UPLOAD_TYPES.join(", ")}.` },
      { status: 400 },
    );
  }
  const type = rawType as UploadType;
  const isProfile = isProfileType(type);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Debes adjuntar un archivo de imagen." }, { status: 400 });
  }

  if (!ALLOWED_INPUT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Sube una imagen JPG, PNG o WEBP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { error: `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)}MB. El máximo permitido es 4MB.` },
      { status: 400 },
    );
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // sharp y @vercel/blob se cargan aquí y no al inicio del archivo: si alguno falla al cargar en el
  // servidor, antes toda la ruta daba 500 sin mensaje; ahora el fallo se captura y se explica.
  const { put } = await import("@vercel/blob");
  let sharp: typeof import("sharp").default | null = null;
  try {
    sharp = (await import("sharp")).default;
  } catch (err) {
    console.error("[upload-image] sharp no cargó; se guarda la imagen original sin optimizar:", err);
  }

  let resizedBuffer: Buffer;
  let outputType: string;
  let ext: string;
  if (!sharp) {
    // Sin optimizador se guarda el archivo tal cual (ya validado: JPG/PNG/WEBP y máximo 4MB).
    resizedBuffer = inputBuffer;
    outputType = file.type === "image/jpg" ? "image/jpeg" : file.type;
    ext = outputType === "image/png" ? "png" : outputType === "image/webp" ? "webp" : "jpg";
  } else {
    if (isProfile) {
      outputType = "image/jpeg";
      ext = "jpg";
      resizedBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(TARGET.profile.width, TARGET.profile.height, {
          fit: "cover",
          position: "centre",
        })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } else {
      outputType = "image/png";
      ext = "png";
      resizedBuffer = await sharp(inputBuffer)
        .rotate()
        .resize(TARGET.logo.width, TARGET.logo.height, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9 })
        .toBuffer();
    }

    // Salvavidas: si la primera pasada quedó pesada (raro en la práctica),
    // reintentamos con más compresión para no superar el límite de salida.
    if (resizedBuffer.length > MAX_OUTPUT_BYTES) {
      if (isProfile) {
        resizedBuffer = await sharp(inputBuffer)
          .rotate()
          .resize(TARGET.profile.width, TARGET.profile.height, {
            fit: "cover",
            position: "centre",
          })
          .jpeg({ quality: 65, mozjpeg: true })
          .toBuffer();
      } else {
        // No palette conversion: it can quantize brand colors and white
        // lettering. Logos get one lossless retry only.
        resizedBuffer = await sharp(inputBuffer)
          .rotate()
          .resize(TARGET.logo.width, TARGET.logo.height, { fit: "inside", withoutEnlargement: true })
          .png({ compressionLevel: 9 })
          .toBuffer();
      }
    }

    const maxOutputBytes = isProfile ? MAX_OUTPUT_BYTES : MAX_LOGO_OUTPUT_BYTES;
    if (resizedBuffer.length > maxOutputBytes) {
      return NextResponse.json(
        {
          error: `El logo optimizado pesa ${(resizedBuffer.length / 1024).toFixed(0)}KB, por encima del máximo de ${maxOutputBytes / 1024}KB. Intenta con un PNG más liviano.`,
        },
        { status: 400 },
      );
    }
  }

  const prefix = BLOB_PREFIX_BY_TYPE[type];
  const blob = await put(`${prefix}/${userId}.${ext}`, resizedBuffer, {
    access: "public",
    contentType: outputType,
    addRandomSuffix: true,
  });

  // select mínimo: sin él Prisma relee TODAS las columnas del usuario y basta que falte una
  // en la base de datos (migración sin aplicar) para que guardar un logo falle.
  await prisma.user.update({ where: { id: userId }, data: { [FIELD_BY_TYPE[type]]: blob.url }, select: { id: true } });

  const finalMetadata = sharp ? await sharp(resizedBuffer).metadata() : null;

  // Devolvemos también el peso final en KB para que el UI pueda mostrar
  // "guardada (45KB)" al usuario.
  return NextResponse.json({
    url: blob.url,
    sizeBytes: resizedBuffer.length,
    width: isProfile ? TARGET.profile.width : finalMetadata?.width,
    height: isProfile ? TARGET.profile.height : finalMetadata?.height,
  });
}

export async function DELETE(request: NextRequest) {
  const userId = await getCurrentUserId();
  const { type: rawType } = await request.json().catch(() => ({}));

  if (typeof rawType !== "string" || !UPLOAD_TYPES.includes(rawType as UploadType)) {
    return NextResponse.json(
      { error: `type debe ser uno de: ${UPLOAD_TYPES.join(", ")}.` },
      { status: 400 },
    );
  }
  const type = rawType as UploadType;

  await prisma.user.update({ where: { id: userId }, data: { [FIELD_BY_TYPE[type]]: null }, select: { id: true } });

  return NextResponse.json({ ok: true });
}
