# Guía del transportista: su ruta, su prueba y su pago

Usted ve **solo su ruta**: paradas, ventanas de hora, contacto del comprador y su pago. No ve precios de la fruta ni datos de otros roles.

## Su ruta de hoy
En **Hoy** está el resumen de sus paradas y **cuánto se le va a pagar y cuándo**.

:::shot role=transportista view=hoy mode=mobile theme=light caption="Su ruta de hoy y su pago prometido."

## En cada parada
1. Cuando llegue, toque **Llegué**. Desde ese momento corre su **reloj de espera**.
2. Si el comprador se tarda, el reloj lo registra. **Pasada la primera hora, la espera se le paga aparte.**
3. Para cerrar la entrega necesita: **nombre de quien recibe**, **foto** y, si puede, la **temperatura**. Entonces toque **Marcar entregada**.

:::shot role=transportista view=entregas mode=mobile theme=light script="click:[data-a='ops:arr'][data-id='s1']|click:[data-a='ops:wait'][data-id='s1']|click:[data-a='ops:wait'][data-id='s1']|click:[data-a='ops:wait'][data-id='s1']|click:[data-a='ops:wait'][data-id='s1']|click:[data-a='ops:wait'][data-id='s1']" caption="Después de 75 minutos de espera: la espera queda registrada y es pagable."
:::shot role=transportista view=entregas mode=mobile theme=light script="click:[data-a='ops:arr'][data-id='s1']|type:[data-a='ops:rcv'][data-id='s1']=Doña Ana|click:[data-a='ops:sphoto'][data-id='s1']|click:[data-a='ops:done'][data-id='s1']" caption="Entrega cerrada con nombre, foto y hora."

> La prueba de entrega **lo protege a usted**: si después el comprador dice que la fruta llegó mal o que nunca llegó, usted tiene la hora, la foto y el nombre de quien recibió.

## Su pago
Abajo está su pago: **la ruta** más **las esperas pagables**, y la fecha en que se paga (viernes). Esa fecha no cambia sin avisarle.

## Si el comprador no recibe
Llame al comprador desde la parada. Si no responde, **avise al gestor** y espere indicaciones; mientras tanto, la espera sigue contando a su favor.
