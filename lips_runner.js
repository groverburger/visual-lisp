import { Interpreter } from './lips.js'

async function lipsDemo() {
  // Create interpreter
  const interpreter = new Interpreter('demo')

  // Add custom JavaScript function
  interpreter.set('log', function(...args) {
    console.log('LIPS Log:', ...args.map(arg =>
      arg && arg.valueOf ? arg.valueOf() : arg
    ))
  })

  // Execute LIPS code
  await interpreter.exec(`
        (define (factorial n)
            (if (<= n 1)
                1
                (* n (factorial (- n 1)))))

        (define numbers '(1 2 3 4 5))
        (define factorials (map factorial numbers))

        (log "Factorials:" factorials)
        (log "Sum:" (apply + factorials))
    `)

  // Get final result
  const result = await interpreter.exec('(factorial 6)')
  console.log('6! =', result[0].valueOf())
  console.log(interpreter.__env__.__env__)
  console.log(interpreter.__env__.__env__.factorial.__code__.cdr)
}

lipsDemo().catch(console.error)
