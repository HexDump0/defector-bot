// take a fuckin' guess (uy97722yq4a0ya5im3u9) mean=1.1311353977164913 stats={'battles': 6709, 'losses': 4113, 'wins': 2295}
export default state => {
  return [Math.random() < 0.6 ? "D" : "C", state.memory]
}