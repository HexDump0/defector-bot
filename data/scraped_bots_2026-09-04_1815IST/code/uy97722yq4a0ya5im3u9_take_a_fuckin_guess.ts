// take a fuckin' guess (uy97722yq4a0ya5im3u9) mean=1.1253792449544326 stats={'battles': 4382, 'losses': 2716, 'wins': 1487}
export default state => {
  return [Math.random() < 0.6 ? "D" : "C", state.memory]
}