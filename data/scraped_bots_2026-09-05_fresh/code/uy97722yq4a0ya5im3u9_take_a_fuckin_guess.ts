// take a fuckin' guess (uy97722yq4a0ya5im3u9) mean=1.1518938284260327 stats={'battles': 4685, 'losses': 2899, 'wins': 1589}
export default state => {
  return [Math.random() < 0.6 ? "D" : "C", state.memory]
}