// take a fuckin' guess (uy97722yq4a0ya5im3u9) mean=1.1179171925025402 stats={'battles': 4415, 'losses': 2739, 'wins': 1495}
export default state => {
  return [Math.random() < 0.6 ? "D" : "C", state.memory]
}