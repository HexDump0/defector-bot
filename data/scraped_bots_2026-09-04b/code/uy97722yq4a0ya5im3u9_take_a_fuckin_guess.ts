// take a fuckin' guess (uy97722yq4a0ya5im3u9) mean=1.1704164839596711 stats={'battles': 3860, 'losses': 2387, 'wins': 1315}
export default state => {
  return [Math.random() < 0.6 ? "D" : "C", state.memory]
}