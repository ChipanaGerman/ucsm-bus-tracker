export type RouteId = "norte" | "sur" | "este" | "oeste";
export type Coordinate = { lat: number; lng: number };
export type RoutePoint = {
  id: string;
  name: string;
  order: number;
  // Las láminas indican vías, no coordenadas ni puntos de embarque autorizados.
  coordinate: Coordinate | null;
  boardingVerified: boolean;
};
export type BusRoute = {
  id: RouteId;
  name: string;
  code: string;
  color: string;
  light: string;
  area: string;
  departure: string;
  arrival: string;
  duration: number;
  image: string;
  points: RoutePoint[];
};
const points = (id: RouteId, names: string[]): RoutePoint[] =>
  names.map((name, index) => ({
    id: `${id}-${index + 1}`,
    name,
    order: index + 1,
    coordinate: null,
    boardingVerified: false,
  }));

export const routes: BusRoute[] = [
  {
    id: "norte",
    name: "Ruta Norte",
    code: "N",
    color: "#07866f",
    light: "#e5f5ef",
    area: "Cayma · Cerro Colorado · Umacollo",
    departure: "06:00",
    arrival: "06:50",
    duration: 50,
    image: "/routes/ruta_norte.jpg",
    points: points("norte", [
      "Av. Bolognesi (Cayma)",
      "Estadio La Tomilla",
      "Calle Honorio Delgado",
      "Jr. Buenos Aires",
      "Jr. Túpac Amaru",
      "Calle Aviación",
      "Campo de Toros El Azufral",
      "Av. Aeropuerto",
      "Av. Aviación",
      "Av. Pumacahua",
      "Av. Ejército",
      "Calle Los Arces",
      "Av. Trinidad Morán",
      "Av. José A. Quiñones",
      "Av. Víctor A. Belaúnde",
      "Calle Lazo de los Ríos",
      "Av. Ricardo Palma",
      "Calle José Santos Chocano",
      "Av. San Jerónimo",
    ]),
  },
  {
    id: "sur",
    name: "Ruta Sur",
    code: "S",
    color: "#e6863a",
    light: "#fff1e6",
    area: "J. F. Kennedy · Vallecito · Umacollo",
    departure: "06:05",
    arrival: "06:45",
    duration: 40,
    image: "/routes/ruta_sur.jpg",
    points: points("sur", [
      "Av. J. F. Kennedy",
      "Av. Guardia Civil",
      "Av. Hartley",
      "Av. EE. UU.",
      "Óvalo Apacheta",
      "Av. Perú",
      "Av. Daniel Alcides Carrión",
      "Av. Salaverry",
      "Calle 28 de Julio",
      "Av. San Martín",
      "Óvalo Vallecito",
      "Puente San Martín",
      "Av. Ricardo Palma",
      "Calle José Santos Chocano",
      "Av. San Jerónimo",
    ]),
  },
  {
    id: "este",
    name: "Ruta Este",
    code: "E",
    color: "#6375d4",
    light: "#eef0ff",
    area: "Av. Jesús · Cercado · Umacollo",
    departure: "05:50",
    arrival: "06:50",
    duration: 60,
    image: "/routes/ruta_este.jpg",
    points: points("este", [
      "Av. Jesús",
      "Calle Túpac Amaru",
      "Calle Mariscal Castilla",
      "Av. Lima",
      "Plaza Umachiri",
      "Calle Sepúlveda",
      "Calle Palacios",
      "Av. Mariscal Castilla",
      "La Paz",
      "Don Bosco",
      "Ayacucho",
      "Pte. Grau",
      "Av. Ejército",
      "Av. Emmel",
      "Calle José Santos Chocano",
      "Av. San Jerónimo",
    ]),
  },
  {
    id: "oeste",
    name: "Ruta Oeste",
    code: "O",
    color: "#ad69a1",
    light: "#f7edf5",
    area: "Socabaya · Hunter · Sachaca · Umacollo",
    departure: "05:50",
    arrival: "06:55",
    duration: 65,
    image: "/routes/ruta_oeste.jpg",
    points: points("oeste", [
      "Óvalo Apacheta",
      "Av. Socabaya",
      "Av. Independencia (Ciudad Mi Trabajo)",
      "Calle Túpac Amaru",
      "Av. La Amistad",
      "Calle Arica",
      "Av. Viña del Mar",
      "Av. Las Américas (Hunter)",
      "Av. Alfonso Ugarte",
      "Puente Tingo",
      "Av. Fernandini",
      "Callejón de los Mojados",
      "Calle Unión",
      "Las Magnolias",
      "Las Rosas",
      "Av. Brasil",
      "Calle Taboada",
      "Calle Chullo",
      "Calle Las Dalias",
      "Los Tulipanes",
      "Av. Víctor Andrés Belaúnde",
      "Calle Lazo de los Ríos",
      "Av. Ricardo Palma",
      "Calle José Santos Chocano",
      "Av. San Jerónimo",
    ]),
  },
];
export const routeById = (id: string) =>
  routes.find((route) => route.id === id) ?? routes[0];
export const sourceNotice =
  "Transcripción de las cuatro láminas proporcionadas para el proyecto. Turno mañana; fecha de vigencia no indicada. Las vías del recorrido no certifican paraderos de embarque.";
export const officialSources = [
  {
    title: "Servicio de transporte gratuito UCSM",
    date: "7 de marzo de 2025",
    url: "https://ucsm.edu.pe/con-el-inicio-del-ano-academico-2025-la-ucsm-brinda-servicio-de-transporte-gratuito-a-sus-estudiantes/",
  },
  {
    title: "Incorporación de buses eléctricos",
    date: "25 de noviembre de 2025",
    url: "https://ucsm.edu.pe/ucsm-es-la-primera-universidad-del-peru-en-incorporar-buses-electricos-para-el-transporte-gratuito-de-sus-estudiantes/",
  },
];
