import {SocksClient} from "socks";

try {

    const info = await SocksClient.createConnection({
        command: undefined,
        destination: undefined,
        existing_socket: undefined,
        set_tcp_nodelay: false,
        socket_options: undefined,
        timeout: 0,
        proxy:{
            host: 'localhost',
            port: 9051,
            type: 5
        }
    });

    console.log(info)
}catch (e) {
    console.log(e)
}
