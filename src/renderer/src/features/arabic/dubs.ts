// Curated seed list of TMDB IDs that are known to have Arabic dub tracks.
// TMDB doesn't expose a "has Arabic dub" flag, so we maintain this list
// manually. It's intentionally biased toward Disney / Pixar / DreamWorks /
// Illumination / Marvel — those are the titles that the Arabic-speaking
// market actually dubs and that show up on Arabic streaming aggregators.
//
// To add a title later: append its TMDB numeric id below. Order doesn't
// matter — the page sorts by TMDB popularity after fetching.

export const ARABIC_DUB_MOVIE_IDS: number[] = [
  // Pixar
  12, // Finding Nemo
  14160, // Up
  10681, // WALL·E
  920, // Cars
  150540, // Inside Out
  1022789, // Inside Out 2
  354912, // Coco
  508442, // Soul
  62177, // Brave
  10193, // Toy Story 3
  301528, // Toy Story 4
  9806, // The Incredibles
  260513, // Incredibles 2
  127380, // Finding Dory
  // Disney animation
  109445, // Frozen
  330457, // Frozen II
  420818, // The Lion King (2019)
  8587, // The Lion King (1994)
  277834, // Moana
  38757, // Tangled
  177572, // Big Hero 6
  82690, // Wreck-It Ralph
  269149, // Zootopia
  568124, // Encanto
  // Illumination / DreamWorks
  20352, // Despicable Me
  211672, // Minions
  808, // Shrek
  10192, // Shrek 2
  10191, // How to Train Your Dragon
  // Marvel / blockbusters that got broad Arabic dubs
  19995, // Avatar
  76600, // Avatar: The Way of Water
  299534, // Avengers: Endgame
  299536, // Avengers: Infinity War
  569094, // Spider-Man: Across the Spider-Verse
  324857, // Spider-Man: Into the Spider-Verse
  447365, // Guardians of the Galaxy Vol. 3
  315635, // Spider-Man: Homecoming
  // Recent family hits
  447277, // The Little Mermaid (2023)
  502356, // The Super Mario Bros. Movie
  1011985 // Kung Fu Panda 4
]

export const ARABIC_DUB_TV_IDS: number[] = [
  // Most TV Arabic-dubbing happens on regional broadcasters (MBC3, Spacetoon,
  // etc.) and rarely shows up on TMDB-id embed servers. The few that do:
  387, // SpongeBob SquarePants
  60625, // Rick and Morty (has Arabic subs widely, dubs occasionally)
  60572, // The Loud House
  1408 // House M.D. (commonly dubbed)
]
